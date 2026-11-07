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

/// One completion of the word at the caret, or the next word when the caret
/// is between words.
public struct WordCompletion: Equatable, Hashable, Sendable {
    /// The full word, with the letters that the user typed in the case that
    /// the user typed them.
    public let word: String
    /// The letters that the field already holds. Empty for a next word.
    public let partial: String
    /// True when a space goes before the word, as after a mark with no
    /// space.
    public let spaceBefore: Bool

    /// A completion, or `nil` when the word does not continue the partial.
    public init?(word: String, partial: String) {
        guard
            !partial.isEmpty,
            word.count > partial.count,
            word.lowercased().hasPrefix(partial.lowercased())
        else { return nil }
        self.word = partial + word.dropFirst(partial.count)
        self.partial = partial
        spaceBefore = false
    }

    /// The word that comes next, or `nil` when `word` has no letter.
    public init?(nextWord word: String, spaceBefore: Bool) {
        guard word.contains(where: \.isLetter) else { return nil }
        self.word = word
        partial = ""
        self.spaceBefore = spaceBefore
    }

    /// The rest of the word and a space, after a space when `spaceBefore` is
    /// true.
    public var textToType: String {
        (spaceBefore ? " " : "") + String(word.dropFirst(partial.count)) + " "
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
        guard !context.partialWord.isEmpty || context.isBetweenWords else { return [] }
        // Only the text before the caret goes to the spell checker of macOS.
        let typed = context.typed
        let caret = NSRange(location: typed.utf16.count, length: 0)
        let words: [String] = await withCheckedContinuation { continuation in
            _ = checker.requestCandidates(
                forSelectedRange: caret, in: typed, types: NSTextCheckingAllSystemTypes, options: nil,
                inSpellDocumentWithTag: tag
            ) { _, candidates in
                continuation.resume(returning: candidates.compactMap(\.replacementString))
            }
        }
        return Self.completions(from: words, for: context)
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

    /// The candidates for `context`, best first, with no repeats. With a
    /// partial word, they complete it, and the candidate that repeats the
    /// partial is not a completion. Between words, they are next words, with
    /// a space before the word when the candidate starts with one. An emoji
    /// is neither.
    public static func completions(
        from candidates: [String], for context: PredictionContext
    ) -> [WordCompletion] {
        let partial = context.partialWord
        var seen = Set<String>()
        return candidates
            .compactMap { candidate in
                let word = candidate.trimmingCharacters(in: .whitespaces)
                return partial.isEmpty
                    ? WordCompletion(nextWord: word, spaceBefore: candidate.first == " ")
                    : WordCompletion(word: word, partial: partial)
            }
            .filter { seen.insert($0.word.lowercased()).inserted }
            .prefix(limit)
            .map { $0 }
    }
}
