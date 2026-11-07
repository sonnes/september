import AppKit

/// Gives completions for the word at the caret. The best match comes first.
@MainActor
public protocol WordCompleting {
    func completions(for context: PredictionContext) async -> [WordCompletion]
    /// Tells the source what the user did with a completion that they picked.
    func record(_ response: WordResponse, to completion: WordCompletion)
}

extension WordCompleting {
    public func record(_ response: WordResponse, to completion: WordCompletion) {}
}

/// What the user did with a picked completion, at the end of the text.
public enum WordResponse: Sendable, CustomStringConvertible {
    /// The text still holds the word.
    case accepted
    /// The user changed the word after the pick.
    case edited

    public var description: String {
        switch self {
        case .accepted: "accepted"
        case .edited: "edited"
        }
    }
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

/// Word completions from the candidates of macOS, the words that the
/// QuickType bar shows. The candidates use the words before the caret, and
/// macOS learns from the responses that the keyboard records.
@MainActor
public final class CandidateCompleter: WordCompleting {
    /// The most completions in the word row.
    public static let limit = Metrics.Predictions.wordSlots

    private let checker = NSSpellChecker.shared
    private let tag = NSSpellChecker.uniqueSpellDocumentTag()

    public init() {}

    public func completions(for context: PredictionContext) async -> [WordCompletion] {
        let partial = context.partialWord
        guard !partial.isEmpty else { return [] }
        // Only the text before the caret goes to the spell checker of macOS.
        let typed = context.typed
        let caret = NSRange(location: typed.utf16.count, length: 0)
        let words: [String] = await withCheckedContinuation { continuation in
            _ = checker.requestCandidates(
                forSelectedRange: caret, in: typed, types: NSTextCheckingAllSystemTypes, options: nil,
                inSpellDocumentWithTag: tag
            ) { _, candidates in
                continuation.resume(
                    returning: candidates.compactMap {
                        $0.replacementString?.trimmingCharacters(in: .whitespaces)
                    })
            }
        }
        return Self.completions(from: words, partial: partial)
    }

    public func record(_ response: WordResponse, to completion: WordCompletion) {
        let answer: NSSpellChecker.CorrectionResponse =
            switch response {
            case .accepted: .accepted
            case .edited: .edited
            }
        checker.record(
            answer, toCorrection: completion.word, forWord: completion.partial, language: nil,
            inSpellDocumentWithTag: tag)
    }

    /// The candidates that complete `partial`, best first, with no repeats.
    /// The candidate that repeats the partial and an emoji are not
    /// completions.
    public static func completions(from words: [String], partial: String) -> [WordCompletion] {
        var seen = Set<String>()
        return words
            .compactMap { WordCompletion(word: $0, partial: partial) }
            .filter { seen.insert($0.word.lowercased()).inserted }
            .prefix(limit)
            .map { $0 }
    }
}
