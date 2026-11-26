import CoreGraphics
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
    await wordEndTests()
    await typingTests()
    await historyTests()
    await candidateTests()
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

    test("a caret inside a word has no word to complete") {
        expectEqual(partial("hello", caret: 2), "")
    }

    test("the next word can come at the start, after a space, and after a mark") {
        func between(_ text: String, caret: Int? = nil) -> Bool {
            PredictionContext(text: text, caret: caret ?? text.utf16.count, mode: .type, said: [])
                .isBetweenWords
        }
        expect(between(""))
        expect(between("Hello "))
        expect(between("Hello,"))
        expect(between("Are you ok?\n"))
        expect(!between("Hel"), "a partial word gets completions")
        expect(!between("Hello", caret: 2), "the caret is inside a word")
        expect(!between("Hello world", caret: 6), "a word follows the caret")
    }

    test("a next word types the word and a space, and a space first after a mark") {
        expectEqual(WordCompletion(nextWord: "there", spaceBefore: false)?.textToType, "there ")
        expectEqual(WordCompletion(nextWord: "I", spaceBefore: true)?.textToType, " I ")
        expectEqual(WordCompletion(nextWord: "I", spaceBefore: true)?.word, "I")
        expect(WordCompletion(nextWord: "", spaceBefore: false) == nil)
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

    test("the candidates become completions of the partial word, without repeats") {
        let words = CandidateCompleter.completions(
            from: ["cu ", "cup ", "Cup ", "cut ", "cute ", "custom ", "current ",
                "customer ", "cuddle ", "curious ", "curry ", "culture "].map { WordCandidate($0) },
            for: PredictionContext(text: "Cu", caret: 2, mode: .type, said: []))
        expectEqual(
            words.map(\.word),
            ["Cup", "Cut", "Cute", "Custom", "Current", "Customer", "Cuddle", "Curious", "Curry", "Culture"])
        expect(words.allSatisfy { $0.kind == .completion })
    }

    test("a candidate that does not start with the typed letters is a correction of the whole word") {
        let words = CandidateCompleter.completions(
            from: [WordCandidate("recieve"), WordCandidate("receive"), WordCandidate("relieve")],
            for: PredictionContext(text: "I recieve", caret: 9, mode: .type, said: []))
        expectEqual(words.map(\.word), ["receive", "relieve"])
        expectEqual(words.first?.kind, .correction)
        expectEqual(words.first?.deleteCount, 7, "the typed word goes")
        expectEqual(words.first?.textToType, "receive ")
    }

    test("a correction says that it corrects the word, and a completion says only the word") {
        expectEqual(WordCompletion(replacing: "recieve", with: "receive", isEmoji: false)?.spokenLabel, "Correct to receive")
        expectEqual(WordCompletion(word: "cup", partial: "cu")?.spokenLabel, "cup")
        expectEqual(WordCompletion(replacing: "pizza", with: "🍕", isEmoji: true)?.spokenLabel, "🍕")
    }

    test("an emoji candidate replaces the typed word with the emoji") {
        let words = CandidateCompleter.completions(
            from: [WordCandidate("pizza"), WordCandidate("pizzas"), WordCandidate("🍕", isEmoji: true)],
            for: PredictionContext(text: "I love pizza", caret: 12, mode: .type, said: []))
        expectEqual(words.map(\.word), ["pizzas", "🍕"])
        let emoji = words.last
        expectEqual(emoji?.kind, .emoji)
        expectEqual(emoji?.deleteCount, 5)
        expectEqual(emoji?.textToType, "🍕 ")
    }

    test("a completion keeps its letters, and a replacing word deletes the whole word") {
        let context = PredictionContext(text: "I recieve", caret: 9, mode: .type, said: [])
        let fix = CandidateCompleter.completions(from: [WordCandidate("receive")], for: context)[0]
        expectEqual(fix.deleteCount, 7)
        expectEqual(WordCompletion(word: "cup", partial: "cu")?.deleteCount, 0)
    }

    test("the request sends the paragraph of the caret, with the caret inside it") {
        let context = PredictionContext(
            text: "Dear Sam,\nI love piz now\nBye", caret: 20, mode: .type, said: [])
        let request = CandidateRequest(context: context)
        expectEqual(request.text, "I love piz now")
        expectEqual(request.caret, NSRange(location: 10, length: 0))
    }

    test("the word row gives each word its own width and leaves the rest empty") {
        let fit = WordRowFit(words: ["cup", "customer", "cut"], width: 400, measure: { word, _ in CGFloat(word.count * 10) })
        let padding = Metrics.Predictions.wordPadding * 2
        expectEqual(fit.indices, [0, 1, 2])
        expectEqual(fit.widths, [30 + padding, 80 + padding, 30 + padding])
        let used = fit.widths.reduce(0, +) + Metrics.Predictions.wordSpacing * 3
        expectEqual(fit.emptyWidth, 400 - used)
    }

    test("a word that does not fit is left out, a shorter one after it can fit, and a full row fills its width") {
        let fit = WordRowFit(
            words: ["cup", "customer", "currently", "cut"], width: 260, measure: { word, _ in CGFloat(word.count * 10) })
        expectEqual(fit.indices, [0, 1, 3])
        expect(fit.emptyWidth == nil)
        let total = fit.widths.reduce(0, +) + Metrics.Predictions.wordSpacing * CGFloat(fit.widths.count - 1)
        expectEqual(total, 260)
    }

    test("a short word keeps the least width of a button, and the best word is measured in its own font") {
        var bestFlags: [Bool] = []
        let fit = WordRowFit(words: ["a", "I"], width: 400) { _, isBest in
            bestFlags.append(isBest)
            return 8
        }
        expectEqual(fit.widths, [Metrics.Predictions.wordMinWidth, Metrics.Predictions.wordMinWidth])
        expectEqual(bestFlags, [true, false])
    }

    test("a row with no words is one empty slot") {
        let fit = WordRowFit(words: [], width: 400, measure: { _, _ in 0 })
        expect(fit.indices.isEmpty)
        expectEqual(fit.emptyWidth, 400)
    }

    test("between words, the candidates become next words with the space they ask for") {
        let words = CandidateCompleter.completions(
            from: [" I ", " I’m ", " I ", " we "].map { WordCandidate($0) },
            for: PredictionContext(text: "Hello,", caret: 6, mode: .type, said: []))
        expectEqual(words.map(\.textToType), [" I ", " I’m ", " we "])
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
}

@MainActor
private func noticeTests() {
    test("only the Off state offers System Settings") {
        expect(PredictionNotice.appleIntelligence(.off).opensSystemSettings)
        expect(!PredictionNotice.appleIntelligence(.notSupported).opensSystemSettings)
        expect(!PredictionNotice.appleIntelligence(.modelNotReady).opensSystemSettings)
        expect(!PredictionNotice.passwordField.opensSystemSettings)
    }
}

private struct PredictionFailed: Error {}

@MainActor
private func makeEngine(
    _ predictor: FakePredictor,
    completer: FakeCompleter = FakeCompleter(),
    defaults: UserDefaults = freshDefaults(),
    history: SentenceHistory? = nil
) -> PredictionEngine {
    PredictionEngine(
        predictor: predictor, completer: completer, delay: .zero, defaults: defaults,
        history: history)
}

@MainActor
private func makeHistory(_ sentences: [String] = []) throws -> SentenceHistory {
    let history = SentenceHistory(
        database: try KeyboardDatabase(path: ":memory:"),
        defaults: freshDefaults())
    for sentence in sentences { history.record(sentence) }
    return history
}

extension PredictionEngine {
    /// The rows of both columns, history first, for a test that checks
    /// only what shows.
    var allRows: [PredictionStripe] { (historyRows + modelRows).compactMap { $0 } }
}

/// The uses of each sentence, by key.
@MainActor
private func uses(in database: KeyboardDatabase) throws -> [String: Int64] {
    var uses: [String: Int64] = [:]
    for row in try database.query("SELECT key, uses FROM sentence") {
        if let key = row[0].text, let count = row[1].int { uses[key] = count }
    }
    return uses
}

private let tea: @Sendable (PredictionContext) -> [String] = { _ in
    ["I would like a cup of tea, please.", "I would like a cup of coffee now.", "I would like a custard tart.", "I would like a cushion."]
}

extension PredictionEngine {
    func userTypes(
        _ input: InputMirror, mode: PredictionMode = .type, said: [String] = [],
        screen: ScreenContext? = nil
    ) {
        let empty: InputMirror =
            if case .mirrored = input { .mirrored(text: "", caret: 0, selectionLength: 0) } else { .local(text: "") }
        update(input: empty, mode: mode, said: said)
        update(input: input, mode: mode, said: said, screen: screen)
    }
}

@MainActor
private func engineTests() async {
    let cu = InputMirror.mirrored(text: "I would like a cu", caret: 17, selectionLength: 0)
    let a = InputMirror.mirrored(text: "I would like a ", caret: 15, selectionLength: 0)

    await asyncTest("the engine shows three predictions after the delay, best first") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.userTypes(a)
        expect(engine.allRows.isEmpty)
        await engine.settle()
        expectEqual(engine.allRows.map(\.prediction), Array(tea(PredictionContext(text: "", caret: 0, mode: .type, said: [])).prefix(3)))
        expectEqual(engine.allRows.first?.text(toTypeThrough: 2), "cup of tea, ")
    }

    await asyncTest("word completions do not wait for the sentence delay") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.update(input: cu, mode: .type, said: [])
        await engine.settleWords()
        expectEqual(engine.words.map(\.word), ["cup"])
        expect(engine.allRows.isEmpty)
    }

    await asyncTest("while new words load, the old words that still complete the word stay") {
        let completer = FakeCompleter()
        let engine = makeEngine(FakePredictor(answer: tea), completer: completer)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settleWords()
        completer.holds = true
        engine.update(input: .local(text: "I would like a c"), mode: .type, said: [])
        expectEqual(engine.words.map(\.textToType), ["up "])
        engine.update(input: .local(text: "I would like a cx"), mode: .type, said: [])
        expect(engine.words.isEmpty, "a word that no longer fits must not type wrong letters")
        completer.release()
        await engine.settleWords()
    }

    await asyncTest("a space clears the completions of the last word at once") {
        let completer = FakeCompleter()
        let engine = makeEngine(FakePredictor(answer: tea), completer: completer)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settleWords()
        completer.holds = true
        engine.update(input: .local(text: "I would like a cu "), mode: .type, said: [])
        expect(engine.words.isEmpty)
        completer.release()
        await engine.settleWords()
    }

    await asyncTest("Return records a picked word that the text still holds as accepted") {
        let completer = FakeCompleter()
        let engine = makeEngine(FakePredictor(answer: tea), completer: completer)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settleWords()
        engine.wordPicked(engine.words[0])
        engine.update(input: .local(text: "I would like a cup "), mode: .type, said: [])
        engine.submit()
        expectEqual(completer.responses, ["accepted cup"])
        engine.submit()
        expectEqual(completer.responses, ["accepted cup"], "a submit records a pick one time")
    }

    await asyncTest("a picked word that the user changed is recorded as edited") {
        let completer = FakeCompleter()
        let engine = makeEngine(FakePredictor(answer: tea), completer: completer)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settleWords()
        engine.wordPicked(engine.words[0])
        engine.update(input: .local(text: "I would like a cupboard "), mode: .type, said: [])
        engine.submit()
        expectEqual(completer.responses, ["edited cup"])
    }

    await asyncTest("the picked words are forgotten, not recorded, when the field changes") {
        let completer = FakeCompleter()
        let engine = makeEngine(FakePredictor(answer: tea), completer: completer)
        engine.update(input: cu, mode: .type, said: [])
        await engine.settleWords()
        engine.wordPicked(engine.words[0])
        engine.focusMoved()
        engine.submit()
        expectEqual(completer.responses, [])
    }

    await asyncTest("private text and a password field record no picked word") {
        let completer = FakeCompleter()
        let engine = makeEngine(FakePredictor(answer: tea), completer: completer)
        for (input, isPrivate) in [(InputMirror.local(text: "I would like a cup "), true), (.secure, false)] {
            engine.update(input: cu, mode: .type, said: [])
            await engine.settleWords()
            engine.wordPicked(engine.words[0])
            engine.update(input: input, mode: .type, said: [], isPrivate: isPrivate)
            engine.submit()
        }
        expectEqual(completer.responses, [])
    }

    await asyncTest("quick changes make one request, for the last text") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.update(input: .local(text: ""), mode: .type, said: [])
        engine.update(input: .local(text: "Hi. "), mode: .type, said: [])
        engine.update(input: .local(text: "Hi. I am "), mode: .type, said: [])
        engine.update(input: .local(text: "Hi. I am here."), mode: .type, said: [])
        await engine.settle()
        let requests = await predictor.requests
        expectEqual(requests.map(\.typed), ["Hi. I am here."])
    }

    await asyncTest("the same input makes no new request") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.userTypes(a)
        await engine.settle()
        engine.update(input: a, mode: .type, said: [])
        await engine.settle()
        let count = await predictor.requests.count
        expectEqual(count, 1)
    }

    await asyncTest("a new input drops the answer of an old request") {
        let predictor = FakePredictor(
            holds: { $0.typed == "old " },
            answer: { [$0.typed + "answer"] })
        let engine = makeEngine(predictor)
        engine.userTypes(.local(text: "old "))
        await predictor.waitUntilHeld(1)
        engine.update(input: .local(text: "new "), mode: .type, said: [])
        await engine.settle()
        expectEqual(engine.allRows.map(\.prediction), ["new answer"])
        await predictor.release()
        await predictor.waitUntilAnswered(2)
        expectEqual(engine.allRows.map(\.prediction), ["new answer"])
    }

    await asyncTest("old model rows that still continue the field stay until the new ones arrive") {
        let predictor = FakePredictor(holds: { $0.typed.hasSuffix("of ") }, answer: tea)
        let engine = makeEngine(predictor)
        engine.userTypes(a)
        await engine.settle()
        let of = InputMirror.mirrored(text: "I would like a cup of ", caret: 22, selectionLength: 0)
        engine.update(input: of, mode: .type, said: [])
        await predictor.waitUntilHeld(1)
        expectEqual(
            engine.modelRows.map(\.?.prediction),
            ["I would like a cup of tea, please.", "I would like a cup of coffee now."],
            "the custard row no longer continues the field")
        await predictor.release()
        await engine.settle()
    }

    await asyncTest("a password field shows no predictions and sends no request") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.userTypes(a)
        await engine.settle()
        engine.update(input: .secure, mode: .type, said: [])
        await engine.settle()
        expect(engine.allRows.isEmpty)
        expect(engine.words.isEmpty)
        expectEqual(engine.notice, .passwordField)
        let count = await predictor.requests.count
        expectEqual(count, 1)
    }

    await asyncTest("a selection shows no predictions") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.update(input: .mirrored(text: "hello", caret: 0, selectionLength: 5), mode: .type, said: [])
        await engine.settle()
        expect(engine.allRows.isEmpty)
        expect(engine.notice == nil)
    }

    await asyncTest("with Apple Intelligence off, words still work and a notice shows") {
        let predictor = FakePredictor(availability: .off, answer: tea)
        let engine = makeEngine(predictor)
        engine.userTypes(cu)
        await engine.settle()
        expect(engine.allRows.isEmpty)
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
        engine.userTypes(cu)
        await engine.settle()
        expect(engine.allRows.isEmpty)
        expect(engine.words.isEmpty)
        expect(engine.notice == nil)
        let count = await predictor.requests.count
        expectEqual(count, 0)
    }

    await asyncTest("turning sentences off clears the stack") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.userTypes(a)
        await engine.settle()
        expect(!engine.allRows.isEmpty)
        engine.sentencesEnabled = false
        expect(engine.allRows.isEmpty)
    }

    await asyncTest("the screen switch is off until the user turns it on, and keeps its state") {
        let defaults = freshDefaults()
        let engine = makeEngine(FakePredictor(answer: tea), defaults: defaults)
        expect(!engine.screenEnabled)
        engine.screenEnabled = true
        expect(makeEngine(FakePredictor(answer: tea), defaults: defaults).screenEnabled)
    }

    await asyncTest("new text on screen makes a new request") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        let first = ScreenContext(appName: "WhatsApp", title: nil, field: nil, lines: ["Hi"])
        let second = ScreenContext(appName: "WhatsApp", title: nil, field: nil, lines: ["Hi", "Lunch?"])
        engine.userTypes(a, screen: first)
        await engine.settle()
        engine.update(input: a, mode: .type, said: [], screen: second)
        await engine.settle()
        let requests = await predictor.requests
        expectEqual(requests.map(\.screen), [first, second])
    }

    await asyncTest("the switches keep their state") {
        let defaults = freshDefaults()
        makeEngine(FakePredictor(answer: tea), defaults: defaults).wordsEnabled = false
        let again = makeEngine(FakePredictor(answer: tea), defaults: defaults)
        expect(!again.wordsEnabled)
        expect(again.sentencesEnabled)
    }

    await asyncTest("a failed request clears the stack") {
        let predictor = FakePredictor { context in
            if context.typed == "Hi, fail " { throw PredictionFailed() }
            return ["fine"]
        }
        let engine = makeEngine(predictor)
        engine.userTypes(.local(text: "Hi, "))
        await engine.settle()
        expect(!engine.allRows.isEmpty)
        engine.update(input: .local(text: "Hi, fail "), mode: .type, said: [])
        await engine.settle()
        expect(engine.allRows.isEmpty)
    }

    await asyncTest("an answer that only continues the field becomes a full row") {
        let engine = makeEngine(FakePredictor { _ in ["cup of tea, please."] })
        engine.userTypes(a)
        await engine.settle()
        expectEqual(engine.allRows.map(\.prediction), ["I would like a cup of tea, please."])
        expectEqual(engine.allRows.first?.text(toTypeThrough: 2), "cup of tea, ")
    }

    await asyncTest("a new Said list makes a new request") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.userTypes(.local(text: "Hi "), mode: .talk)
        await engine.settle()
        engine.update(input: .local(text: "Hi "), mode: .talk, said: ["Hello"])
        await engine.settle()
        let requests = await predictor.requests
        expectEqual(requests.map(\.said), [[], ["Hello"]])
    }
}

@MainActor
private func wordEndTests() async {
    let a = InputMirror.mirrored(text: "I would like a ", caret: 15, selectionLength: 0)

    await asyncTest("letters inside a word send no request") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        for text in ["I would like a c", "I would like a cu", "I don'"] {
            engine.userTypes(.local(text: text))
            await engine.settle()
        }
        let count = await predictor.requests.count
        expectEqual(count, 0)
    }

    await asyncTest("a space, a mark, or a new line sends one request after the delay") {
        for text in ["I would like ", "Hello,", "See you soon.", "Hello\n"] {
            let predictor = FakePredictor(answer: tea)
            let engine = makeEngine(predictor)
            engine.userTypes(.local(text: text))
            var count = await predictor.requests.count
            expectEqual(count, 0, "\(text.count) characters: the request waits for the delay")
            await engine.settle()
            count = await predictor.requests.count
            expectEqual(count, 1, "\(text.count) characters")
        }
    }

    await asyncTest("inside a word, a model row that still continues the typed text stays") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.userTypes(a)
        await engine.settle()
        engine.update(input: .mirrored(text: "I would like a cu", caret: 17, selectionLength: 0), mode: .type, said: [])
        await engine.settle()
        expectEqual(engine.allRows.first?.prediction, "I would like a cup of tea, please.")
        expectEqual(engine.allRows.first?.text(toTypeThrough: 2), "p of tea, ")
        let count = await predictor.requests.count
        expectEqual(count, 1)
    }
}

@MainActor
private func typingTests() async {
    let cupSpace = InputMirror.mirrored(text: "I would like a cup ", caret: 19, selectionLength: 0)
    let a = InputMirror.mirrored(text: "I would like a ", caret: 15, selectionLength: 0)

    await asyncTest("a field that gets the focus shows no sentence predictions until the user types") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.update(input: cupSpace, mode: .type, said: [])
        await engine.settle()
        expect(engine.allRows.isEmpty)
        var count = await predictor.requests.count
        expectEqual(count, 0)

        engine.update(input: a, mode: .type, said: [])
        await engine.settle()
        expect(!engine.allRows.isEmpty)
        count = await predictor.requests.count
        expectEqual(count, 1)
    }

    await asyncTest("the word row does not wait for typing") {
        let engine = makeEngine(FakePredictor(answer: tea))
        engine.update(input: .mirrored(text: "I would like a cu", caret: 17, selectionLength: 0), mode: .type, said: [])
        await engine.settleWords()
        expectEqual(engine.words.map(\.word), ["cup"])
    }

    await asyncTest("a focus move clears the predictions until the user types again") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.userTypes(a)
        await engine.settle()
        engine.focusMoved()
        engine.update(input: .mirrored(text: "Hello there", caret: 11, selectionLength: 0), mode: .type, said: [])
        await engine.settle()
        expect(engine.allRows.isEmpty)
        let count = await predictor.requests.count
        expectEqual(count, 1)
    }

    await asyncTest("a field that the keyboard starts to read is not typing") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.update(input: .local(text: ""), mode: .type, said: [])
        engine.update(input: a, mode: .type, said: [])
        await engine.settle()
        expect(engine.allRows.isEmpty)
        let count = await predictor.requests.count
        expectEqual(count, 0)
    }

    await asyncTest("a change of mode is not typing") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.userTypes(.local(text: "Hi "), mode: .talk)
        await engine.settle()
        engine.update(input: .local(text: "I would like a "), mode: .type, said: [])
        await engine.settle()
        expect(engine.allRows.isEmpty)
        let count = await predictor.requests.count
        expectEqual(count, 1)
    }

    await asyncTest("text with no letter before the caret shows no sentence predictions") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.userTypes(a)
        await engine.settle()
        for text in ["", "  ", "42 "] {
            engine.update(input: .mirrored(text: text, caret: text.utf16.count, selectionLength: 0), mode: .type, said: [])
            await engine.settle()
            expect(engine.allRows.isEmpty, "\(text.count) characters")
        }
        let count = await predictor.requests.count
        expectEqual(count, 1)
    }

    await asyncTest("an empty Talk bar shows no sentence predictions") {
        let predictor = FakePredictor(answer: tea)
        let engine = makeEngine(predictor)
        engine.update(input: .local(text: ""), mode: .talk, said: ["Hello"])
        await engine.settle()
        expect(engine.allRows.isEmpty)
        let count = await predictor.requests.count
        expectEqual(count, 0)
    }
}

@MainActor
private func historyTests() async {
    let cu = InputMirror.mirrored(text: "I would like a cu", caret: 17, selectionLength: 0)
    let sent = [
        "I would like a cup of tea, please.", "I would like a cup of tea, please.",
        "I would like a cup of tea, please.", "I would like a cushion.", "I would like a cushion.",
        "I would like a cupcake.",
    ]

    await asyncTest("history rows show at once, before the model answers") {
        let engine = makeEngine(FakePredictor(answer: tea), history: try makeHistory(["I would like a cupcake."]))
        engine.userTypes(cu)
        expectEqual(engine.allRows.map(\.prediction), ["I would like a cupcake."])
        expectEqual(engine.allRows.first?.text(toTypeThrough: 0), "pcake. ")
    }

    await asyncTest("up to three history rows and up to three model rows show") {
        let bakery = FakePredictor { _ in
            ["I would like a scone.", "I would like a bun.", "I would like a muffin.", "I would like a roll."]
        }
        let engine = makeEngine(bakery, history: try makeHistory(["I would like a curry."] + sent))
        engine.userTypes(.local(text: "I would like a "))
        await engine.settle()
        expectEqual(
            engine.historyRows.map(\.?.prediction),
            ["I would like a cup of tea, please.", "I would like a cushion.", "I would like a cupcake."])
        expectEqual(engine.modelRows.count, 3)
    }

    await asyncTest("history rows are in score order, and a model row with the words of a history row does not show") {
        let engine = makeEngine(FakePredictor(answer: tea), history: try makeHistory(sent))
        engine.userTypes(.local(text: "I would like a "))
        await engine.settle()
        expectEqual(engine.historyRows.first??.prediction, "I would like a cup of tea, please.")
        expectEqual(
            engine.modelRows.map(\.?.prediction),
            ["I would like a cup of coffee now.", "I would like a custard tart."],
            "the tea row and the cushion row are history rows")
    }

    await asyncTest("each row has its source, and its spoken label starts with the source") {
        let engine = makeEngine(FakePredictor(answer: tea), history: try makeHistory(["I would like a cupcake."]))
        engine.userTypes(.local(text: "I would like a "))
        await engine.settle()
        let history = engine.historyRows.first ?? nil
        let model = engine.modelRows.first ?? nil
        expectEqual(history?.source, .history)
        expectEqual(model?.source, .model)
        expectEqual(history?.spokenLabel(through: 0), "Said before: cupcake.")
        expectEqual(model?.spokenLabel(through: 1), "Suggested: cup of")
    }

    await asyncTest("a history row keeps its place while it continues the typed text, and a new row fills only an empty place") {
        let history = try makeHistory(sent)
        let engine = makeEngine(FakePredictor(), history: history)
        engine.userTypes(.mirrored(text: "I would like a c", caret: 16, selectionLength: 0))
        let first = ["I would like a cup of tea, please.", "I would like a cushion.", "I would like a cupcake."]
        expectEqual(engine.historyRows.map(\.?.prediction), first)

        for _ in 0..<4 { history.record("I would like a cup of coffee.") }
        engine.update(input: cu, mode: .type, said: [])
        expectEqual(engine.historyRows.map(\.?.prediction), first, "a better row waits for an empty place")

        engine.update(input: .mirrored(text: "I would like a cup", caret: 18, selectionLength: 0), mode: .type, said: [])
        expectEqual(
            engine.historyRows.map(\.?.prediction),
            ["I would like a cup of tea, please.", "I would like a cup of coffee.", "I would like a cupcake."],
            "the cushion row leaves, and the coffee row takes its place")
    }

    await asyncTest("a model row keeps its place while it continues the typed text") {
        let predictor = FakePredictor { context in
            context.typed.hasSuffix("cup ")
                ? ["I would like a cup of milk.", "I would like a cup of coffee now."] : tea(context)
        }
        let engine = makeEngine(predictor)
        engine.userTypes(.local(text: "I would like a "))
        await engine.settle()
        engine.update(input: .local(text: "I would like a cup "), mode: .type, said: [])
        await engine.settle()
        expectEqual(
            engine.modelRows.map(\.?.prediction),
            ["I would like a cup of tea, please.", "I would like a cup of coffee now.", "I would like a cup of milk."])
    }

    await asyncTest("a model row that repeats a history sentence after earlier sentences shows one time") {
        let engine = makeEngine(
            FakePredictor { _ in ["Thanks. I would like a cupcake."] },
            history: try makeHistory(["I would like a cupcake."]))
        engine.userTypes(.local(text: "Thanks. I would like a "))
        await engine.settle()
        expectEqual(engine.allRows.count, 1)
    }

    await asyncTest("history rows wait for typing, as model rows do") {
        let engine = makeEngine(FakePredictor(answer: tea), history: try makeHistory(sent))
        engine.update(input: cu, mode: .type, said: [])
        expect(engine.allRows.isEmpty)
    }

    await asyncTest("history rows show when Apple Intelligence is off, in the place of its notice") {
        let engine = makeEngine(
            FakePredictor(availability: .off, answer: tea), history: try makeHistory(["I would like a cupcake."]))
        engine.userTypes(cu)
        await engine.settle()
        expectEqual(engine.allRows.map(\.prediction), ["I would like a cupcake."])
        expect(engine.notice == nil)
        engine.update(input: .mirrored(text: "Hello", caret: 5, selectionLength: 0), mode: .type, said: [])
        await engine.settle()
        expectEqual(engine.notice, .appleIntelligence(.off), "with no history row, the notice shows")
    }

    await asyncTest("a cleared or turned-off history shows no row of its old sentences") {
        for turnsOff in [false, true] {
            let history = try makeHistory(["See you soon."])
            let engine = makeEngine(FakePredictor(answer: tea), history: history)
            engine.userTypes(.mirrored(text: "See y", caret: 5, selectionLength: 0))
            await engine.settle()
            expectEqual(engine.historyRows.map(\.?.prediction), ["See you soon."])
            if turnsOff { history.isEnabled = false } else { history.clear() }
            expect(engine.historyRows.isEmpty, "the row goes at once")
            engine.update(input: .mirrored(text: "See yo", caret: 6, selectionLength: 0), mode: .type, said: [])
            await engine.settle()
            expect(engine.historyRows.isEmpty, "the row does not come back while it continues the text")
        }
    }

    await asyncTest("the sentence switch turns off the history rows") {
        let engine = makeEngine(FakePredictor(answer: tea), history: try makeHistory(sent))
        engine.sentencesEnabled = false
        engine.userTypes(cu)
        await engine.settle()
        expect(engine.allRows.isEmpty)
    }

    await asyncTest("submit keeps each sentence of the whole field") {
        let history = try makeHistory()
        let engine = makeEngine(FakePredictor(answer: tea), history: history)
        let text = "Dear Sam.\nSee you soon. Bye now\nLater."
        engine.update(input: .mirrored(text: text, caret: 15, selectionLength: 0), mode: .type, said: [])
        engine.submit()
        expectEqual(history.count, 4)
        expectEqual(history.matches(for: "Bye"), ["Bye now"])
        expectEqual(history.matches(for: "Dear"), ["Dear Sam."])
    }

    await asyncTest("Return pressed two times in one field adds one use to each sentence") {
        let database = try KeyboardDatabase(path: ":memory:")
        let history = SentenceHistory(database: database, defaults: freshDefaults())
        let engine = makeEngine(FakePredictor(answer: tea), history: history)
        engine.update(input: .local(text: "Hi Sam. See you soon."), mode: .type, said: [])
        engine.submit()
        engine.update(input: .local(text: "Hi Sam. See you soon. Bye."), mode: .type, said: [])
        engine.submit()
        expectEqual(try uses(in: database), ["bye": 1, "hi sam": 1, "see you soon": 1])
    }

    await asyncTest("after a focus move or an empty field, the same sentence adds one more use") {
        let database = try KeyboardDatabase(path: ":memory:")
        let history = SentenceHistory(database: database, defaults: freshDefaults())
        let engine = makeEngine(FakePredictor(answer: tea), history: history)
        engine.update(input: .local(text: "See you soon."), mode: .type, said: [])
        engine.submit()
        engine.focusMoved()
        engine.update(input: .local(text: "See you soon."), mode: .type, said: [])
        engine.submit()
        expectEqual(try uses(in: database), ["see you soon": 2])

        engine.update(input: .local(text: ""), mode: .talk, said: [])
        engine.update(input: .local(text: "See you soon."), mode: .talk, said: [])
        engine.submit()
        engine.update(input: .local(text: ""), mode: .talk, said: [])
        engine.update(input: .local(text: "See you soon."), mode: .talk, said: [])
        engine.submit()
        expectEqual(try uses(in: database), ["see you soon": 4], "the Talk bar empties after each Speak")
    }

    await asyncTest("the Talk bar goes into the history when the user speaks it") {
        let history = try makeHistory()
        let engine = makeEngine(FakePredictor(answer: tea), history: history)
        engine.update(input: .local(text: "Good morning. How are you?"), mode: .talk, said: [])
        engine.submit()
        expectEqual(history.count, 2)
    }

    await asyncTest("private text, a password field, and a submit that keeps no sentences keep nothing") {
        let history = try makeHistory()
        let engine = makeEngine(FakePredictor(answer: tea), history: history)
        engine.update(input: .local(text: "My secret."), mode: .type, said: [], isPrivate: true)
        engine.submit()
        engine.update(input: .secure, mode: .type, said: [])
        engine.submit()
        engine.update(input: .local(text: "In the Write window."), mode: .type, said: [])
        engine.submit(keepsSentences: false)
        expectEqual(history.count, 0)
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
            defaults: freshDefaults())
        expectEqual(engine.availability, .ready)
        for text in ["I would like a ", "I would like a cup of ", "Can we "] {
            engine.update(
                input: .mirrored(text: text, caret: text.utf16.count, selectionLength: 0),
                mode: .talk, said: ["Hi, how are you?"])
            await engine.settle()
            let rows = engine.allRows.map(\.prediction)
            expectEqual(rows.count, 3, "\(text): \(rows)")
            expect(engine.allRows.first?.matches == true, "\(text): no row continues the field: \(rows)")
        }
    }
}

@MainActor
private func candidateTests() async {
    let completer = CandidateCompleter()
    func words(_ text: String) async -> [String] {
        await completer.completions(
            for: PredictionContext(text: text, caret: text.utf16.count, mode: .type, said: [])
        ).map(\.word)
    }

    await asyncTest("the system candidates complete the word at the caret") {
        let found = await words("I would like a cu")
        expect(!found.isEmpty, "no completions")
        expect(found.allSatisfy { $0.lowercased().hasPrefix("cu") })
    }

    await asyncTest("the system candidates give more words than a row of eight for a common start") {
        let found = await words("th")
        expect(found.count > 8, "\(found.count) words")
        expect(found.count <= CandidateCompleter.limit)
    }

    await asyncTest("the system candidates give an emoji and a correction, as the QuickType bar does") {
        let pizza = await completer.completions(
            for: PredictionContext(text: "I love pizza", caret: 12, mode: .type, said: []))
        expect(pizza.contains { $0.kind == .emoji }, "no emoji: \(pizza.map(\.word))")
        let typo = await completer.completions(
            for: PredictionContext(text: "I recieve", caret: 9, mode: .type, said: []))
        expect(typo.contains { $0.word == "receive" && $0.kind == .correction }, "\(typo.map(\.word))")
    }

    await asyncTest("the system candidates give the next word after a space") {
        let found = await words("I would like a cup of ")
        expect(!found.isEmpty, "no next words")
    }

    await asyncTest("the system candidates give nothing with the caret inside a word") {
        let found = await completer.completions(
            for: PredictionContext(text: "Hello", caret: 2, mode: .type, said: []))
        expect(found.isEmpty)
    }
}
