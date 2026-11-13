import Combine
import Foundation

/// Turns the input bar into sentence predictions and word completions.
///
/// The controller calls `update(input:mode:said:)` on each change of the
/// input bar. Word completions do not wait. Sentence predictions wait for
/// `delay` after the last change. A new change cancels the old request. The
/// old predictions stay, marked stale, until the new ones arrive.
///
/// Sentence predictions show only after the user types. The first input
/// after a focus move, a change of mode, or a change of the input kind is
/// the baseline of the field. A later input with other text is typing. The
/// text before the caret must also hold a letter.
///
/// The rows of the stack come from two sources: the sentence history and the
/// model. History rows show at once. Up to `historyLead` of them come first,
/// then the model rows, and then the other history rows.
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

    /// The most history rows that come before the model rows.
    public static let historyLead = 2

    private let predictor: any SentencePredicting
    private let history: SentenceHistory?
    private let completer: any WordCompleting
    private let delay: Duration
    private let defaults: UserDefaults

    private var input: InputMirror = .local(text: "")
    private var mode: PredictionMode = .type
    private var isPrivate = false
    /// The input and the mode when the focus came to the field. It is `nil`
    /// until the first input after a focus move.
    private var baseline: (input: InputMirror, mode: PredictionMode)?
    /// True when the text of the field changed after the baseline.
    private var hasTyped = false
    private var context: PredictionContext?
    /// The context of the current predictions. A failed or cancelled request
    /// leaves it as it was.
    private var requested: PredictionContext?
    private var predictions: [String] = []
    /// The history sentences that continue the typed text, best first.
    private var historyRows: [String] = []
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
        defaults: UserDefaults = .standard,
        history: SentenceHistory? = nil
    ) {
        self.predictor = predictor
        self.history = history
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
        let changed =
            input != self.input || mode != self.mode || context != self.context || isPrivate != self.isPrivate
        if changed || baseline == nil { noteTyping(input, mode: mode) }
        guard changed else { return }
        self.input = input
        self.mode = mode
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
    /// picked word is edited. The sentences of the paragraph at the caret go
    /// into the history when `keepsSentences` is true. Private text and a
    /// password field record nothing.
    public func submit(keepsSentences: Bool = true) {
        defer { picked = [] }
        guard !isPrivate, input.holdsText else { return }
        let words = Set(Self.words(of: input.text))
        for completion in picked {
            completer.record(
                words.contains(completion.word.lowercased()) ? .accepted : .edited, to: completion)
        }
        if keepsSentences { history?.record(Self.paragraph(at: input)) }
    }

    /// The line of the caret. A field with many lines, such as a note, gives
    /// only the paragraph that the user wrote last.
    private static func paragraph(at input: InputMirror) -> String {
        guard case .mirrored(let text, let caret, let selectionLength) = input else { return input.text }
        let parts = InputMirror.split(text, caret: caret, selectionLength: selectionLength)
        let before = parts.before.split(separator: "\n", omittingEmptySubsequences: false).last ?? ""
        let after = (parts.selected + parts.after).split(separator: "\n", omittingEmptySubsequences: false).first ?? ""
        return String(before + after)
    }

    /// The focus moved to another field or app. The picked words cannot be
    /// found again, so they are not recorded. The sentence predictions wait
    /// until the user types in the new field.
    public func focusMoved() {
        picked = []
        baseline = nil
        hasTyped = false
        refresh()
    }

    private func noteTyping(_ input: InputMirror, mode: PredictionMode) {
        guard let baseline, baseline.mode == mode, baseline.input.kind == input.kind else {
            baseline = (input, mode)
            hasTyped = false
            return
        }
        if input.text != baseline.input.text { hasTyped = true }
    }

    private func wantsSentences(_ context: PredictionContext) -> Bool {
        hasTyped && context.typed.contains(where: \.isLetter)
    }

    // MARK: - State

    private func refresh() {
        refreshWords()

        guard let context, sentencesEnabled, wantsSentences(context) else {
            historyRows = []
            stopAsking()
            restripe()
            return
        }
        historyRows = history?.matches(for: context.typed, limit: SuggestionPrompt.count) ?? []
        guard availability == .ready else {
            stopAsking()
            restripe()
            return
        }
        restripe()
        guard context != requested else { return }
        ask(context)
    }

    private func stopAsking() {
        cancel()
        predictions = []
        requested = nil
        isStale = false
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
        if sentences, availability != .ready { return .appleIntelligence(availability) }
        return nil
    }

    /// Builds the rows from the history rows and the model rows, then sets
    /// the notice. A row with the same words as an earlier row does not
    /// show. The notice of Apple Intelligence does not hide history rows.
    private func restripe() {
        let typed = context?.typed ?? ""
        let lead = historyRows.prefix(Self.historyLead)
        let sources = lead + predictions + historyRows.dropFirst(Self.historyLead)
        var rows: [PredictionStripe] = []
        var seen: Set<String> = []
        for source in sources where rows.count < SuggestionPrompt.count {
            let stripe = PredictionStripe(prediction: source, typed: typed)
            guard seen.insert(stripe.tiles.joined(separator: " ").lowercased()).inserted else { continue }
            rows.append(stripe)
        }
        stripes = rows

        let notice =
            isPrivate
            ? .privateText
            : Self.notice(for: input, availability: availability, sentences: sentencesEnabled)
        if case .appleIntelligence = notice, !rows.isEmpty {
            self.notice = nil
        } else {
            self.notice = notice
        }
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
