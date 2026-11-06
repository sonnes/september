import AppKit

/// Gives completions for the word at the caret. The best match comes first.
@MainActor
public protocol WordCompleting {
    func completions(for context: PredictionContext) -> [WordCompletion]
}

/// One completion of the word at the caret.
public struct WordCompletion: Equatable, Hashable, Sendable {
    /// The full word, with the letters that the user typed in the case that
    /// the user typed them.
    public let word: String
    /// The letters that the field already holds.
    public let partial: String

    /// A completion, or `nil` when the word does not continue the partial.
    public init?(word: String, partial: String) {
        guard
            !partial.isEmpty,
            word.count > partial.count,
            word.lowercased().hasPrefix(partial.lowercased())
        else { return nil }
        self.word = partial + word.dropFirst(partial.count)
        self.partial = partial
    }

    /// The rest of the word and a space.
    public var textToType: String {
        String(word.dropFirst(partial.count)) + " "
    }
}

/// Word completions from the macOS spell checker.
@MainActor
public final class SpellCheckerCompleter: WordCompleting {
    /// The most completions in the word row.
    public static let limit = 5

    private let checker = NSSpellChecker.shared
    private let tag = NSSpellChecker.uniqueSpellDocumentTag()

    public init() {}

    public func completions(for context: PredictionContext) -> [WordCompletion] {
        let partial = context.partialWord
        guard !partial.isEmpty else { return [] }
        // Only the partial word goes to the spell checker, not the field.
        let range = NSRange(location: 0, length: partial.utf16.count)
        let words =
            checker.completions(
                forPartialWordRange: range, in: partial, language: nil, inSpellDocumentWithTag: tag
            ) ?? []
        var seen = Set<String>()
        return words
            .compactMap { WordCompletion(word: $0, partial: partial) }
            .filter { seen.insert($0.word.lowercased()).inserted }
            .prefix(Self.limit)
            .map { $0 }
    }
}
