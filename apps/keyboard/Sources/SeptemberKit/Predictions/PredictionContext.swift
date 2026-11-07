import Foundation

/// The mode of the keyboard. In Type mode the user writes into the app in
/// front. In Talk mode the user types in the keyboard and speaks the text to a
/// person in the room.
public enum PredictionMode: Equatable, Sendable {
    case type
    case talk
}

/// The input of one prediction request.
///
/// The caret is a UTF-16 offset, the unit of the accessibility API.
public struct PredictionContext: Equatable, Sendable {
    public var text: String
    public var caret: Int
    public var mode: PredictionMode
    /// The sentences that the user spoke, oldest first.
    public var said: [String]
    /// The app, the window, and the text near the field. Only Type mode
    /// sends it to the model.
    public var screen: ScreenContext?

    public init(
        text: String, caret: Int, mode: PredictionMode, said: [String], screen: ScreenContext? = nil
    ) {
        self.text = text
        self.caret = min(max(0, caret), text.utf16.count)
        self.mode = mode
        self.said = said
        self.screen = screen
    }

    /// The context of the input bar, or `nil` when the keyboard must not
    /// predict. A password field and any other state with no text give `nil`.
    /// A selection also gives `nil`, because a press would replace it.
    public init?(input: InputMirror, mode: PredictionMode, said: [String], screen: ScreenContext? = nil) {
        if case .mirrored(let text, let caret, let selectionLength) = input {
            guard selectionLength == 0 else { return nil }
            self.init(text: text, caret: caret, mode: mode, said: said, screen: screen)
        } else if case .local(let text) = input {
            self.init(text: text, caret: text.utf16.count, mode: mode, said: said, screen: screen)
        } else {
            return nil
        }
    }

    /// The text before the caret.
    public var typed: String {
        InputMirror.split(text, caret: caret, selectionLength: 0).before
    }

    /// The text after the caret.
    public var following: String {
        InputMirror.split(text, caret: caret, selectionLength: 0).after
    }

    /// The letters of the word that ends at the caret. It is empty when the
    /// caret follows a space or a mark, or when the caret is inside a word.
    public var partialWord: String {
        if let next = following.first, Self.isWordCharacter(next) { return "" }
        let word = typed.reversed().prefix(while: Self.isWordCharacter)
        return String(String(word.reversed()).drop(while: Self.isApostrophe))
    }

    /// True when the next word can come at the caret: at the start of the
    /// text, after a space, or after a mark, with no word right after the
    /// caret.
    public var isBetweenWords: Bool {
        if let next = following.first, Self.isWordCharacter(next) { return false }
        guard let last = typed.last else { return true }
        return !Self.isWordCharacter(last)
    }

    /// The same context with the partial word at the caret replaced by a
    /// completion of it and a space.
    public func completing(with completion: WordCompletion) -> PredictionContext {
        let before = String(typed.dropLast(completion.partial.count)) + completion.word + " "
        return PredictionContext(
            text: before + following, caret: before.utf16.count, mode: mode, said: said, screen: screen)
    }

    /// The full sentence of an answer of the model, or `nil` when the answer
    /// does not fit the field. The model either repeats the typed words and
    /// continues them, or gives only the words that come next. In the second
    /// form, the first word must complete the partial word at the caret.
    public func sentence(from answer: String) -> String? {
        let answer = answer.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !answer.isEmpty else { return nil }
        let base = SuggestionPrompt(context: self).typed
        let repeated = PredictionStripe(prediction: answer, typed: base)
        if repeated.matches, repeated.hidden > 0 { return answer }

        let partial = partialWord
        if !partial.isEmpty {
            guard answer.lowercased().hasPrefix(partial.lowercased()) else { return nil }
            return String(base.dropLast(partial.count)) + answer
        }
        if base.isEmpty || base.last?.isWhitespace == true { return base + answer }
        return base + " " + answer
    }

    private static func isWordCharacter(_ character: Character) -> Bool {
        character.isLetter || isApostrophe(character)
    }

    private static func isApostrophe(_ character: Character) -> Bool {
        character == "'" || character == "\u{2019}"
    }
}

extension InputMirror {
    /// True when the bar holds text that the keyboard can predict from.
    var holdsText: Bool {
        if case .mirrored = self { return true }
        if case .local = self { return true }
        return false
    }
}
