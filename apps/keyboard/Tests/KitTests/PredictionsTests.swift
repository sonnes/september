import Foundation
import SeptemberKit

@MainActor
func predictionsTests() async {
    stripeTests()
    contextTests()
    wordTests()
    promptTests()
    noticeTests()
    await engineTests()
    await liveModelTests()
}

@MainActor
private func stripeTests() {
    test("a press on a tile types the rest of the word and the words up to the tile") {
        let stripe = PredictionStripe(
            prediction: "I would like a cup of tea, please.", typed: "I would like a cu")
        expectEqual(stripe.tiles, ["cup", "of", "tea,", "please."])
        expectEqual(stripe.hidden, 4)
        expectEqual(stripe.text(toTypeThrough: 2), "p of tea, ")
        expectEqual(stripe.text(toTypeThrough: 0), "p ")
    }

    test("the lead-in mark shows in Type mode only") {
        let stripe = PredictionStripe(prediction: "Can we go to the garden?", typed: "Can we go")
        expectEqual(stripe.hidden, 3)
        expect(stripe.showsLeadIn(in: .type))
        expect(!stripe.showsLeadIn(in: .talk), "Talk mode shows no lead-in")
        let fresh = PredictionStripe(prediction: "How was your day?", typed: "")
        expect(!fresh.showsLeadIn(in: .type), "a row that hides no words shows no lead-in")
    }

    test("a field that ends with a space continues with the next word") {
        let stripe = PredictionStripe(prediction: "I would like a cup", typed: "I would like ")
        expectEqual(stripe.tiles, ["a", "cup"])
        expectEqual(stripe.text(toTypeThrough: 1), "a cup ")
    }

    test("a field that ends with a full word gets a space first") {
        let stripe = PredictionStripe(prediction: "I would like a cup", typed: "I would like")
        expectEqual(stripe.tiles, ["a", "cup"])
        expectEqual(stripe.text(toTypeThrough: 0), " a ")
    }

    test("an empty field takes the prediction from its first word") {
        let stripe = PredictionStripe(prediction: "How was your day?", typed: "")
        expectEqual(stripe.hidden, 0)
        expectEqual(stripe.tiles, ["How", "was", "your", "day?"])
        expectEqual(stripe.text(toTypeThrough: 3), "How was your day? ")
    }

    test("the match ignores case") {
        let stripe = PredictionStripe(prediction: "I would like tea", typed: "i would LIKE t")
        expectEqual(stripe.tiles, ["tea"])
        expectEqual(stripe.text(toTypeThrough: 0), "ea ")
    }

    test("a prediction that repeats only the last words of the field still matches") {
        let stripe = PredictionStripe(
            prediction: "Can we meet at noon?", typed: "Thanks for the note. Can we me")
        expectEqual(stripe.tiles, ["meet", "at", "noon?"])
        expectEqual(stripe.text(toTypeThrough: 2), "et at noon? ")
    }

    test("a new sentence can follow the end of the last one") {
        let stripe = PredictionStripe(prediction: "See you soon.", typed: "Thanks. ")
        expectEqual(stripe.tiles, ["See", "you", "soon."])
        expect(stripe.matches)
    }

    test("a prediction that does not continue the field is not active") {
        let stripe = PredictionStripe(prediction: "Coffee would be nice.", typed: "I would like a cup of t")
        expect(!stripe.matches)
        expect(stripe.text(toTypeThrough: 0) == nil)
    }

    test("a tile index past the row types nothing") {
        let stripe = PredictionStripe(prediction: "Yes please", typed: "")
        expect(stripe.text(toTypeThrough: 5) == nil)
        expect(stripe.text(toTypeThrough: -1) == nil)
    }

    test("a row stops at the end of a sentence") {
        let stripe = PredictionStripe(prediction: "Yes. I would like that.", typed: "")
        expectEqual(stripe.tiles, ["Yes."])
    }

    test("a row shows six words or fewer") {
        let stripe = PredictionStripe(
            prediction: "one two three four five six seven eight", typed: "")
        expectEqual(stripe.tiles.count, PredictionStripe.maxTiles)
    }

    test("a prediction that the field already holds has no tiles") {
        let stripe = PredictionStripe(prediction: "Hello there", typed: "Hello there ")
        expect(stripe.tiles.isEmpty)
    }
}

@MainActor
private func contextTests() {
    test("a mirrored field gives the text before the caret") {
        let context = PredictionContext(
            input: .mirrored(text: "I like tea a lot", caret: 10, selectionLength: 0),
            mode: .type, said: [])
        expectEqual(context?.typed, "I like tea")
    }

    test("the caret is in UTF-16 units") {
        let context = PredictionContext(
            input: .mirrored(text: "🙂 hi there", caret: 5, selectionLength: 0),
            mode: .type, said: [])
        expectEqual(context?.typed, "🙂 hi")
    }

    test("the echo puts the caret at the end") {
        let context = PredictionContext(input: .local(text: "hello"), mode: .talk, said: ["Hi"])
        expectEqual(context?.typed, "hello")
        expectEqual(context?.mode, .talk)
        expectEqual(context?.said, ["Hi"])
    }

    test("a password field gives no context") {
        expect(PredictionContext(input: .secure, mode: .type, said: []) == nil)
    }

    test("a selection gives no context, because a press would replace it") {
        let context = PredictionContext(
            input: .mirrored(text: "hello", caret: 1, selectionLength: 2), mode: .type, said: [])
        expect(context == nil)
    }
}

@MainActor
private func wordTests() {
    func partial(_ text: String, caret: Int? = nil) -> String {
        PredictionContext(
            text: text, caret: caret ?? text.utf16.count, mode: .type, said: []
        ).partialWord
    }

    test("the word at the caret is the letters just before it") {
        expectEqual(partial("I would like a cu"), "cu")
        expectEqual(partial("I would like a "), "")
        expectEqual(partial(""), "")
        expectEqual(partial("Hello, wor"), "wor")
        expectEqual(partial("I don"), "don")
        expectEqual(partial("I don'"), "don'")
    }

    test("an answer becomes the full sentence, repeated or continued") {
        func sentence(_ typed: String, _ answer: String) -> String? {
            PredictionContext(text: typed, caret: typed.utf16.count, mode: .type, said: [])
                .sentence(from: answer)
        }
        expectEqual(sentence("I would like a cu", "cup of tea."), "I would like a cup of tea.")
        expectEqual(sentence("I would like a cu", "I would like a cup of tea."), "I would like a cup of tea.")
        expectEqual(sentence("I would like ", "a cup"), "I would like a cup")
        expectEqual(sentence("Hello,", "how are you?"), "Hello, how are you?")
        expectEqual(sentence("", "How was your day?"), "How was your day?")
        expectEqual(sentence("Thanks. ", "See you soon."), "Thanks. See you soon.")
        expect(sentence("I would like a cu", "puppy to play with") == nil)
        expect(sentence("I would like", "  ") == nil)
    }

    test("a completion of the partial word ends with a space") {
        let context = PredictionContext(text: "I would like a cu", caret: 17, mode: .talk, said: ["Hi"])
        let completed = context.completing(with: WordCompletion(word: "cup", partial: "cu")!)
        expectEqual(completed.typed, "I would like a cup ")
        expectEqual(completed.said, ["Hi"])
    }

    test("a caret inside a word has no word to complete") {
        expectEqual(partial("hello", caret: 2), "")
    }

    test("a completion types the rest of the word and a space") {
        let completion = WordCompletion(word: "cup", partial: "cu")
        expectEqual(completion?.textToType, "p ")
        expectEqual(completion?.word, "cup")
    }

    test("a completion keeps the case that the user typed") {
        expectEqual(WordCompletion(word: "cup", partial: "Cu")?.word, "Cup")
    }

    test("a word that does not start with the partial, or equals it, is not a completion") {
        expect(WordCompletion(word: "cat", partial: "cu") == nil)
        expect(WordCompletion(word: "cu", partial: "cu") == nil)
    }

    test("the spell checker completes the word at the caret, best match first") {
        let completer = SpellCheckerCompleter()
        let context = PredictionContext(
            text: "I would like a cu", caret: 17, mode: .type, said: [])
        let words = completer.completions(for: context)
        expect(!words.isEmpty, "no completions")
        expect(words.count <= SpellCheckerCompleter.limit)
        expect(words.allSatisfy { $0.word.lowercased().hasPrefix("cu") })
    }

    test("the spell checker fills every slot of the word row for a common start") {
        let completer = SpellCheckerCompleter()
        let context = PredictionContext(text: "th", caret: 2, mode: .type, said: [])
        expectEqual(completer.completions(for: context).count, 8)
    }

    test("the spell checker gives nothing with no word at the caret") {
        let completer = SpellCheckerCompleter()
        let context = PredictionContext(text: "I would ", caret: 8, mode: .type, said: [])
        expect(completer.completions(for: context).isEmpty)
    }
}

@MainActor
private func promptTests() {
    func context(_ typed: String, mode: PredictionMode = .type, said: [String] = []) -> PredictionContext {
        PredictionContext(text: typed, caret: typed.utf16.count, mode: mode, said: said)
    }

    test("an empty field asks for an opening, and a typed field asks for a completion") {
        let opening = SuggestionPrompt(context: context(""))
        let completion = SuggestionPrompt(context: context("I would like a cu"))
        expect(opening.instructions != completion.instructions)
        expect(!opening.prompt.contains("Current input"))
        expect(completion.prompt.contains("\"I would like a cu\""))
    }

    test("the said list goes in the prompt as the lines of the user") {
        let prompt = SuggestionPrompt(context: context("", said: ["Hello", "How are you?"]))
        expect(prompt.prompt.contains("Me: Hello\nMe: How are you?"))
    }

    test("Talk mode and Type mode ask for different text") {
        expect(
            SuggestionPrompt(context: context("Hi", mode: .talk)).instructions
                != SuggestionPrompt(context: context("Hi", mode: .type)).instructions)
    }

    test("a long field sends only its last words") {
        let long = String(repeating: "word ", count: 400) + "last wor"
        let prompt = SuggestionPrompt(context: context(long))
        expect(prompt.typed.count <= SuggestionPrompt.maxTypedCharacters)
        expect(prompt.typed.hasSuffix("last wor"))
        expect(prompt.typed.hasPrefix("word"))
    }

    test("each answer must start with the partial word at the caret") {
        expectEqual(SuggestionPrompt(context: context("I would like a cu")).answerPrefix, "cu")
        expectEqual(SuggestionPrompt(context: context("I am going to the")).answerPrefix, "the")
        expectEqual(SuggestionPrompt(context: context("Can we meet ")).answerPrefix, "")
    }

    test("the prompt asks for as many predictions as the stack shows") {
        expectEqual(SuggestionPrompt.count, 3)
    }
}

@MainActor
private func noticeTests() {
    test("only the Off state offers System Settings") {
        expect(PredictionNotice.appleIntelligence(.off).opensSystemSettings)
        expect(!PredictionNotice.appleIntelligence(.notSupported).opensSystemSettings)
        expect(!PredictionNotice.appleIntelligence(.modelNotReady).opensSystemSettings)
        expect(!PredictionNotice.passwordField.opensSystemSettings)
    }

    test("each notice has a message") {
        let notices: [PredictionNotice] = [
            .appleIntelligence(.off), .appleIntelligence(.notSupported),
            .appleIntelligence(.modelNotReady), .passwordField, .privateText,
        ]
        expect(notices.allSatisfy { !$0.message.isEmpty })
    }
}

/// A predictor that answers from a closure and records each request.
private actor FakePredictor: SentencePredicting {
    nonisolated let availability: PredictionAvailability
    private let answer: @Sendable (PredictionContext) throws -> [String]
    private let wait: @Sendable (PredictionContext) -> Duration
    private(set) var requests: [PredictionContext] = []

    init(
        availability: PredictionAvailability = .ready,
        wait: @escaping @Sendable (PredictionContext) -> Duration = { _ in .zero },
        answer: @escaping @Sendable (PredictionContext) throws -> [String]
    ) {
        self.availability = availability
        self.wait = wait
        self.answer = answer
    }

    func predictions(for context: PredictionContext) async throws -> [String] {
        requests.append(context)
        // Ignores cancellation, so the engine must drop a late answer itself.
        let deadline = ContinuousClock.now + wait(context)
        while ContinuousClock.now < deadline { await Task.yield() }
        return try answer(context)
    }
}

private struct FakeCompleter: WordCompleting {
    func completions(for context: PredictionContext) -> [WordCompletion] {
        WordCompletion(word: "cup", partial: context.partialWord).map { [$0] } ?? []
    }
}

private struct PredictionFailed: Error {}

@MainActor
private func makeEngine(
    _ predictor: FakePredictor,
    defaults: UserDefaults = UserDefaults(suiteName: "kit-tests-\(UUID().uuidString)")!
) -> PredictionEngine {
    PredictionEngine(
        predictor: predictor, completer: FakeCompleter(), delay: .milliseconds(20), defaults: defaults)
}

private let tea: @Sendable (PredictionContext) -> [String] = { _ in
    ["I would like a cup of tea, please.", "I would like a cup of coffee now.", "I would like a custard tart.", "I would like a cushion."]
}

@MainActor
private func asyncTest(_ name: String, _ body: () async throws -> Void) async {
    Run.current = name
    do {
        try await body()
    } catch {
        Run.failures.append("\(name) — threw \(error)")
    }
}

@MainActor
private func engineTests() async {
    let cu = InputMirror.mirrored(text: "I would like a cu", caret: 17, selectionLength: 0)

    await asyncTest("the engine shows three predictions after the delay, best first") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.update(input: cu, mode: .type, said: [])
        expect(engine.stripes.isEmpty)
        await engine.settle()
        expectEqual(engine.stripes.map(\.prediction), Array(tea(PredictionContext(text: "", caret: 0, mode: .type, said: [])).prefix(3)))
        expect(!engine.isStale)
        expectEqual(engine.stripes.first?.text(toTypeThrough: 2), "p of tea, ")
    }

    await asyncTest("word completions show with no delay") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.update(input: cu, mode: .type, said: [])
        expectEqual(engine.words.map(\.word), ["cup"])
    }

    await asyncTest("quick changes make one request, for the last text") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.update(input: .local(text: "I"), mode: .type, said: [])
        engine.update(input: .local(text: "I w"), mode: .type, said: [])
        engine.update(input: .local(text: "I wo"), mode: .type, said: [])
        await engine.settle()
        let requests = await predictor.requests
        expectEqual(requests.map(\.typed), ["I wo"])
    }

    await asyncTest("the same input makes no new request") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        let count = await predictor.requests.count
        expectEqual(count, 1)
    }

    await asyncTest("a new input drops the answer of an old request") {
        let predictor = FakePredictor(
            wait: { $0.typed == "old" ? .milliseconds(150) : .zero },
            answer: { ["\($0.typed) answer"] })
        let engine = makeEngine(predictor)
        engine.update(input: .local(text: "old"), mode: .type, said: [])
        while await predictor.requests.isEmpty { try await Task.sleep(for: .milliseconds(5)) }
        engine.update(input: .local(text: "new"), mode: .type, said: [])
        await engine.settle()
        try await Task.sleep(for: .milliseconds(250))
        expectEqual(engine.stripes.map(\.prediction), ["new answer"])
    }

    await asyncTest("old predictions stay, marked stale, until the new ones arrive") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        let tee = InputMirror.mirrored(text: "I would like a cup of t", caret: 23, selectionLength: 0)
        engine.update(input: tee, mode: .type, said: [])
        expect(engine.isStale)
        expectEqual(engine.stripes.count, 3)
        expect(engine.stripes[0].matches, "the tea row still continues the field")
        expect(!engine.stripes[2].matches, "the custard row no longer continues the field")
        await engine.settle()
        expect(!engine.isStale)
    }

    await asyncTest("a password field shows no predictions and sends no request") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        engine.update(input: .secure, mode: .type, said: [])
        await engine.settle()
        expect(engine.stripes.isEmpty)
        expect(engine.words.isEmpty)
        expectEqual(engine.notice, .passwordField)
        let count = await predictor.requests.count
        expectEqual(count, 1)
    }

    await asyncTest("a selection shows no predictions") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.update(input: .mirrored(text: "hello", caret: 0, selectionLength: 5), mode: .type, said: [])
        await engine.settle()
        expect(engine.stripes.isEmpty)
        expect(engine.notice == nil)
    }

    await asyncTest("with Apple Intelligence off, words still work and a notice shows") {
        let predictor = FakePredictor(availability: .off, answer: tea)
        let engine = makeEngine(predictor)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        expect(engine.stripes.isEmpty)
        expectEqual(engine.words.map(\.word), ["cup"])
        expectEqual(engine.notice, .appleIntelligence(.off))
        let count = await predictor.requests.count
        expectEqual(count, 0)
    }

    await asyncTest("the switches turn off sentences and words") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.sentencesEnabled = false
        engine.wordsEnabled = false
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        expect(engine.stripes.isEmpty)
        expect(engine.words.isEmpty)
        expect(engine.notice == nil)
        let count = await predictor.requests.count
        expectEqual(count, 0)
    }

    await asyncTest("turning sentences off clears the stack") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        engine.sentencesEnabled = false
        expect(engine.stripes.isEmpty)
    }

    await asyncTest("the switches keep their state") {
        let defaults = UserDefaults(suiteName: "kit-tests-\(UUID().uuidString)")!
        makeEngine(FakePredictor(answer: tea), defaults: defaults).wordsEnabled = false
        let again = makeEngine(FakePredictor(answer: tea), defaults: defaults)
        expect(!again.wordsEnabled)
        expect(again.sentencesEnabled)
    }

    await asyncTest("a failed request clears the stack") {
        let predictor = FakePredictor { context in
            if context.typed == "fail" { throw PredictionFailed() }
            return ["fine"]
        }
        let engine = makeEngine(predictor)
        engine.update(input: .local(text: ""), mode: .type, said: [])
        await engine.settle()
        engine.update(input: .local(text: "fail"), mode: .type, said: [])
        await engine.settle()
        expect(engine.stripes.isEmpty)
        expect(!engine.isStale)
    }

    await asyncTest("a failed request asks again with the best completion of the partial word") {
        let predictor = FakePredictor { context in
            if context.typed.hasSuffix("cu") { throw PredictionFailed() }
            return ["of tea."]
        }
        let engine = makeEngine(predictor)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        expectEqual(engine.stripes.map(\.prediction), ["I would like a cup of tea."])
        expectEqual(engine.stripes.first?.text(toTypeThrough: 1), "p of ")
    }

    await asyncTest("an answer that only continues the field becomes a full row") {
        let engine = makeEngine(FakePredictor { _ in ["cup of tea, please."] })
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        expectEqual(engine.stripes.map(\.prediction), ["I would like a cup of tea, please."])
        expectEqual(engine.stripes.first?.text(toTypeThrough: 2), "p of tea, ")
    }

    await asyncTest("an answer that does not fit the field is dropped") {
        let predictor = FakePredictor { _ in ["Coffee is fine.", "I would like a cup of tea."] }
        let engine = makeEngine(predictor)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settle()
        expectEqual(engine.stripes.map(\.prediction), ["I would like a cup of tea."])
    }

    await asyncTest("a new Said list makes a new request") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.update(input: .local(text: ""), mode: .talk, said: [])
        await engine.settle()
        engine.update(input: .local(text: ""), mode: .talk, said: ["Hello"])
        await engine.settle()
        let requests = await predictor.requests
        expectEqual(requests.map(\.said), [[], ["Hello"]])
    }
}

/// Asks Apple Intelligence for real predictions. It runs only with
/// `KIT_LIVE_MODEL=1`, because a reply takes seconds and needs the model.
@MainActor
private func liveModelTests() async {
    guard ProcessInfo.processInfo.environment["KIT_LIVE_MODEL"] == "1" else { return }
    await asyncTest("Apple Intelligence gives three predictions that continue the field") {
        let engine = PredictionEngine(
            predictor: AppleIntelligencePredictor(),
            defaults: UserDefaults(suiteName: "kit-tests-\(UUID().uuidString)")!)
        expectEqual(engine.availability, .ready)
        for text in ["I would like a cu", "I would like a cup of t", "Can we me"] {
            engine.update(
                input: .mirrored(text: text, caret: text.utf16.count, selectionLength: 0),
                mode: .talk, said: ["Hi, how are you?"])
            await engine.settle()
            let rows = engine.stripes.map(\.prediction)
            expectEqual(rows.count, 3, "\(text): \(rows)")
            expect(engine.stripes.first?.matches == true, "\(text): no row continues the field: \(rows)")
        }
    }
}
