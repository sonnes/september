import Foundation
import SeptemberKit

@MainActor
func predictionsTests() async {
    stripeTests()
    contextTests()
    wordTests()
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

    test("the spell checker gives nothing with no word at the caret") {
        let completer = SpellCheckerCompleter()
        let context = PredictionContext(text: "I would ", caret: 8, mode: .type, said: [])
        expect(completer.completions(for: context).isEmpty)
    }
}
