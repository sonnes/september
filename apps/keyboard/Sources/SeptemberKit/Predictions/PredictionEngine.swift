import Combine
import CryptoKit
import Foundation

/// Turns the input bar into sentence predictions and word completions.
///
/// The controller calls `update(input:mode:said:)` on each change of the
/// input bar. Word completions do not wait. The model gets a request only
/// at the end of a word: when the text before the caret ends with a space, a
/// mark, or a new line. The request waits for `delay` after the last change,
/// for a paste or a fast burst of keys. A new change cancels the old request.
/// The old predictions stay, marked stale, until the new ones arrive. Inside
/// a word, a model row stays active while it continues the typed text.
///
/// Sentence predictions show only after the user types. The first input
/// after a focus move, a change of mode, or a change of the input kind is
/// the baseline of the field. A later input with other text is typing. The
/// text before the caret must also hold a letter.
///
/// The rows of the stack are in two columns, one for each source. The
/// history column holds up to three sentences of the history, best score
/// first, and shows them at once. The model column holds up to three rows of
/// the model. A model row with the words of a history row does not show.
///
/// A row that shows keeps its place while it continues the typed text, so a
/// row does not move under a dwell or a switch. A new row fills only an
/// empty place. A place is `nil` while it is empty.
///
/// The engine keeps the completions that the user picks. When the user
/// submits the text, it tells the completer which picked words the text
/// still holds.
@MainActor
public final class PredictionEngine: ObservableObject {
    /// The places of the history column, best first. A `nil` place is
    /// empty. The list has no empty place at its end.
    @Published public private(set) var historyRows: [PredictionStripe?] = []
    /// The places of the model column, in the same form.
    @Published public private(set) var modelRows: [PredictionStripe?] = []
    /// The completions of the word at the caret, best first.
    @Published public private(set) var words: [WordCompletion] = []
    /// The message that the stack shows in place of predictions.
    @Published public private(set) var notice: PredictionNotice?
    @Published public private(set) var availability: PredictionAvailability
    /// The context of the input bar, or `nil` when the keyboard must not
    /// predict, as for a password field or private text.
    @Published public private(set) var context: PredictionContext?
    /// The last request for sentences, for the Debug panel. It is `nil`
    /// while the engine asks for no sentences.
    @Published public private(set) var trace: PredictionTrace?

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
    /// The context of the current predictions. A failed or cancelled request
    /// leaves it as it was.
    private var requested: PredictionContext?
    private var predictions: [String] = []
    /// The history sentences that continue the typed text, best first.
    private var historyMatches: [String] = []
    private var request: Task<Void, Never>?
    /// Counts the requests, so a late answer to an old one is dropped.
    private var generation = 0
    private var wordRequest: Task<Void, Never>?
    private var wordGeneration = 0
    /// The completions that the user picked since the last submit.
    private var picked: [WordCompletion] = []
    /// The hashes of the sentence keys that the history counted for the
    /// focused field. A sentence adds one use per field. The set empties
    /// when the focus moves or the field becomes empty, as the Talk bar does
    /// after Speak.
    private var counted: Set<SHA256.Digest> = []
    private var historyCleared: AnyCancellable?

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
        // A clear, or a switch that turns the history off, removes the rows
        // of the history at once. A kept row would show a deleted sentence.
        // `@Published` sends the new count before it stores it.
        historyCleared = history?.$count.sink { [weak self, weak history] count in
            guard let self, let history, count < history.count else { return }
            self.historyRows = []
            self.refresh()
        }
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
        if input.text.isEmpty { counted = [] }
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
    /// picked word is edited. The sentences of the whole field go into the
    /// history when `keepsSentences` is true. Each sentence adds one use per
    /// field. Private text and a password field record nothing.
    public func submit(keepsSentences: Bool = true) {
        defer { picked = [] }
        guard !isPrivate, input.holdsText else { return }
        let words = Set(Self.words(of: input.text))
        for completion in picked {
            completer.record(
                words.contains(completion.word.lowercased()) ? .accepted : .edited, to: completion)
        }
        if keepsSentences { history?.record(input.text, counted: &counted) }
    }

    /// The focus moved to another field or app. The picked words cannot be
    /// found again, so they are not recorded. The sentence predictions wait
    /// until the user types in the new field.
    public func focusMoved() {
        picked = []
        counted = []
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
            historyMatches = []
            historyRows = []
            stopAsking()
            restripe()
            return
        }
        // More matches than places, so that a new match can fill a place
        // that a kept row leaves.
        historyMatches = history?.matches(for: context.typed, limit: SuggestionPrompt.count * 2) ?? []
        guard availability == .ready else {
            stopAsking()
            restripe()
            return
        }
        restripe()
        guard context.endsWord, context != requested else { return }
        ask(context)
    }

    private func stopAsking() {
        cancel()
        predictions = []
        modelRows = []
        requested = nil
        trace = nil
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

    /// Builds the two columns, then sets the notice. A row with the same
    /// words as an earlier row does not show. The notice of Apple
    /// Intelligence does not hide history rows.
    private func restripe() {
        let typed = context?.typed ?? ""
        var seen: Set<String> = []
        let history = Self.places(
            kept: historyRows, candidates: historyMatches, source: .history, typed: typed, seen: &seen)
        let model = Self.places(
            kept: modelRows, candidates: predictions, source: .model, typed: typed, seen: &seen)
        if history != historyRows { historyRows = history }
        if model != modelRows { modelRows = model }
        let rows = history.compactMap { $0 } + model.compactMap { $0 }

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

    /// The places of one column. Each kept row that still continues the typed
    /// text stays in its place. Then each candidate fills the first empty
    /// place. `seen` holds the words of the rows that show.
    private static func places(
        kept: [PredictionStripe?], candidates: [String], source: PredictionSource, typed: String,
        seen: inout Set<String>
    ) -> [PredictionStripe?] {
        func shows(_ stripe: PredictionStripe) -> Bool {
            stripe.matches && !stripe.tiles.isEmpty
                && seen.insert(stripe.tiles.joined(separator: " ").lowercased()).inserted
        }
        var places: [PredictionStripe?] = (0..<SuggestionPrompt.count).map { index in
            guard index < kept.count, let old = kept[index] else { return nil }
            let stripe = PredictionStripe(prediction: old.prediction, typed: typed, source: source)
            return shows(stripe) ? stripe : nil
        }
        for candidate in candidates {
            guard let empty = places.firstIndex(where: { $0 == nil }) else { break }
            let stripe = PredictionStripe(prediction: candidate, typed: typed, source: source)
            if shows(stripe) { places[empty] = stripe }
        }
        while let last = places.last, last == nil { places.removeLast() }
        return places
    }

    private func cancel() {
        request?.cancel()
        request = nil
        generation += 1
    }

    private func ask(_ context: PredictionContext) {
        cancel()
        requested = context
        trace = PredictionTrace(context: context)
        let generation = generation
        let predictor = predictor
        let delay = delay
        request = Task { [weak self] in
            do {
                try await Task.sleep(for: delay)
            } catch {
                return
            }
            let clock = ContinuousClock()
            let start = clock.now
            let answers = try? await predictor.predictions(for: context)
            let sentences = answers?.compactMap(context.sentence(from:))
            guard let self, self.generation == generation else { return }
            var trace = PredictionTrace(context: context)
            trace.answers = answers ?? []
            trace.sentences = sentences ?? []
            trace.duration = clock.now - start
            self.trace = trace
            self.predictions = sentences ?? []
            self.restripe()
        }
    }
}
