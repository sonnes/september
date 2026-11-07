import Combine
import Foundation

/// Turns the input bar into sentence predictions and word completions.
///
/// The controller calls `update(input:mode:said:)` on each change of the
/// input bar. Word completions do not wait. Sentence predictions wait for
/// `delay` after the last change. A new change cancels the old request. The
/// old predictions stay, marked stale, until the new ones arrive.
///
/// The engine keeps the completions that the user picks. When the user
/// submits the text, it tells the completer which picked words the text
/// still holds.
@MainActor
public final class PredictionEngine: ObservableObject {
    /// The rows of the stack, best first.
    @Published public private(set) var stripes: [PredictionStripe] = []
    /// True while the stripes belong to an older text and new ones are on
    /// the way.
    @Published public private(set) var isStale = false
    /// The completions of the word at the caret, best first.
    @Published public private(set) var words: [WordCompletion] = []
    /// The message that the stack shows in place of predictions.
    @Published public private(set) var notice: PredictionNotice?
    @Published public private(set) var availability: PredictionAvailability

    @Published public var sentencesEnabled: Bool {
        didSet {
            defaults.set(sentencesEnabled, forKey: Keys.sentences)
            refresh()
        }
    }
    @Published public var wordsEnabled: Bool {
        didSet {
            defaults.set(wordsEnabled, forKey: Keys.words)
            refresh()
        }
    }
    /// True when the keyboard reads the text near the field in Type mode for
    /// the sentence predictions. It is off until the user turns it on.
    @Published public var screenEnabled: Bool {
        didSet { defaults.set(screenEnabled, forKey: Keys.screen) }
    }

    private enum Keys {
        static let sentences = "predictions.sentences"
        static let words = "predictions.words"
        static let screen = "predictions.screen"
    }

    private let predictor: any SentencePredicting
    private let completer: any WordCompleting
    private let delay: Duration
    private let defaults: UserDefaults

    private var input: InputMirror = .local(text: "")
    private var isPrivate = false
    private var context: PredictionContext?
    /// The context of the current predictions. A failed or cancelled request
    /// leaves it as it was.
    private var requested: PredictionContext?
    private var predictions: [String] = []
    private var request: Task<Void, Never>?
    /// Counts the requests, so a late answer to an old one is dropped.
    private var generation = 0
    private var wordRequest: Task<Void, Never>?
    private var wordGeneration = 0
    /// The completions that the user picked since the last submit.
    private var picked: [WordCompletion] = []

    public init(
        predictor: any SentencePredicting = AppleIntelligencePredictor(),
        completer: any WordCompleting = CandidateCompleter(),
        delay: Duration = .milliseconds(300),
        defaults: UserDefaults = .standard
    ) {
        self.predictor = predictor
        self.completer = completer
        self.delay = delay
        self.defaults = defaults
        availability = predictor.availability
        sentencesEnabled = defaults.object(forKey: Keys.sentences) as? Bool ?? true
        wordsEnabled = defaults.object(forKey: Keys.words) as? Bool ?? true
        screenEnabled = defaults.bool(forKey: Keys.screen)
    }

    /// Feeds the engine with the input bar. A password field, a selection,
    /// and any other state with no text show no predictions. `isPrivate` is
    /// true while private text is in the focused field.
    public func update(
        input: InputMirror, mode: PredictionMode, said: [String], isPrivate: Bool = false,
        screen: ScreenContext? = nil
    ) {
        let context = isPrivate ? nil : PredictionContext(input: input, mode: mode, said: said, screen: screen)
        guard input != self.input || context != self.context || isPrivate != self.isPrivate else { return }
        self.input = input
        self.context = context
        self.isPrivate = isPrivate
        refresh()
    }

    /// Reads the state of the model again, for example when the keyboard
    /// comes to the front or the Settings page opens.
    public func refreshAvailability() {
        let current = predictor.availability
        guard current != availability else { return }
        availability = current
        requested = nil
        refresh()
    }

    /// Waits for the pending requests to finish.
    public func settle() async {
        await settleWords()
        await request?.value
    }

    /// Waits for the pending word completions.
    public func settleWords() async {
        await wordRequest?.value
    }

    // MARK: - Picked words

    /// The user pressed a completion in the word row.
    public func wordPicked(_ completion: WordCompletion) {
        picked.append(completion)
    }

    /// The user submitted the text, with Return or with Speak in Talk mode.
    /// Each picked word that the text still holds is accepted. Each other
    /// picked word is edited. Private text and a password field record
    /// nothing.
    public func submit() {
        defer { picked = [] }
        guard !isPrivate, input.holdsText else { return }
        let words = Set(Self.words(of: input.text))
        for completion in picked {
            completer.record(
                words.contains(completion.word.lowercased()) ? .accepted : .edited, to: completion)
        }
    }

    /// The focus moved to another field or app, so the picked words cannot be
    /// found again. They are not recorded.
    public func forgetPickedWords() {
        picked = []
    }

    // MARK: - State

    private func refresh() {
        notice =
            isPrivate
            ? .privateText
            : Self.notice(for: input, availability: availability, sentences: sentencesEnabled)
        refreshWords()

        guard let context, sentencesEnabled, availability == .ready else {
            cancel()
            predictions = []
            requested = nil
            isStale = false
            restripe()
            return
        }
        restripe()
        guard context != requested else { return }
        ask(context)
    }

    private func refreshWords() {
        wordRequest?.cancel()
        wordRequest = nil
        wordGeneration += 1
        guard wordsEnabled, let context else {
            words = []
            return
        }
        // Until the new words arrive, keep the old words that still complete
        // the word at the caret, so a press never types the wrong letters.
        // Between words, no old word fits.
        let partial = context.partialWord
        words = partial.isEmpty ? [] : words.compactMap { WordCompletion(word: $0.word, partial: partial) }
        let generation = wordGeneration
        let completer = completer
        wordRequest = Task { [weak self] in
            let found = await completer.completions(for: context)
            guard let self, self.wordGeneration == generation else { return }
            self.words = found
        }
    }

    private static func words(of text: String) -> [String] {
        text.lowercased()
            .split { !($0.isLetter || $0 == "'" || $0 == "\u{2019}") }
            .map(String.init)
    }

    private static func notice(
        for input: InputMirror, availability: PredictionAvailability, sentences: Bool
    ) -> PredictionNotice? {
        if case .secure = input { return .passwordField }
        // A state with no text that is not a password field holds private text.
        if !input.holdsText { return .privateText }
        if sentences, availability != .ready { return .appleIntelligence(availability) }
        return nil
    }

    private func restripe() {
        let typed = context?.typed ?? ""
        stripes = predictions.map { PredictionStripe(prediction: $0, typed: typed) }
    }

    private func cancel() {
        request?.cancel()
        request = nil
        generation += 1
    }

    private func ask(_ context: PredictionContext) {
        cancel()
        requested = context
        isStale = !predictions.isEmpty
        let generation = generation
        let predictor = predictor
        let delay = delay
        request = Task { [weak self] in
            do {
                try await Task.sleep(for: delay)
            } catch {
                return
            }
            var sentences = try? await predictor.predictions(for: context)
                .compactMap(context.sentence(from:))
            // The guardrail of the model can refuse a partial word that looks
            // like a bad word, such as "cu". The full word passes.
            if sentences == nil, !Task.isCancelled,
                let best = self?.words.first, !best.partial.isEmpty, best.partial == context.partialWord
            {
                let retry = context.completing(with: best)
                sentences = try? await predictor.predictions(for: retry)
                    .compactMap(retry.sentence(from:))
            }
            guard let self, self.generation == generation else { return }
            self.predictions = Array((sentences ?? []).prefix(SuggestionPrompt.count))
            self.isStale = false
            self.restripe()
        }
    }
}
