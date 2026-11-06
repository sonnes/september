import Combine
import Foundation

/// Turns the input bar into sentence predictions and word completions.
///
/// The controller calls `update(input:mode:said:)` on each change of the
/// input bar. Word completions change at once. Sentence predictions wait for
/// `delay` after the last change. A new change cancels the old request. The
/// old predictions stay, marked stale, until the new ones arrive.
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

    private enum Keys {
        static let sentences = "predictions.sentences"
        static let words = "predictions.words"
    }

    private let predictor: any SentencePredicting
    private let completer: any WordCompleting
    private let delay: Duration
    private let defaults: UserDefaults

    private var input: InputMirror = .local(text: "")
    private var context: PredictionContext?
    /// The context of the current predictions. A failed or cancelled request
    /// leaves it as it was.
    private var requested: PredictionContext?
    private var predictions: [String] = []
    private var request: Task<Void, Never>?
    /// Counts the requests, so a late answer to an old one is dropped.
    private var generation = 0

    public init(
        predictor: any SentencePredicting = AppleIntelligencePredictor(),
        completer: any WordCompleting = SpellCheckerCompleter(),
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
    }

    /// Feeds the engine with the input bar. A password field, a selection,
    /// and any other state with no text show no predictions.
    public func update(input: InputMirror, mode: PredictionMode, said: [String]) {
        let context = PredictionContext(input: input, mode: mode, said: said)
        guard input != self.input || context != self.context else { return }
        self.input = input
        self.context = context
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

    /// Waits for the pending request to finish.
    public func settle() async {
        await request?.value
    }

    // MARK: - State

    private func refresh() {
        notice = Self.notice(for: input, availability: availability, sentences: sentencesEnabled)
        words = wordsEnabled ? context.map(completer.completions(for:)) ?? [] : []

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
        // The guardrail of the model can refuse a partial word that looks
        // like a bad word, such as "cu". The full word passes.
        let retry = completer.completions(for: context).first.map(context.completing(with:))
        request = Task { [weak self] in
            do {
                try await Task.sleep(for: delay)
            } catch {
                return
            }
            var sentences = try? await predictor.predictions(for: context)
                .compactMap(context.sentence(from:))
            if sentences == nil, let retry, !Task.isCancelled {
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
