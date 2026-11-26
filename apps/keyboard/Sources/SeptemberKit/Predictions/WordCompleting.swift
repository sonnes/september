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
    /// What a press on the completion does to the typed word.
    public enum Kind: Equatable, Hashable, Sendable {
        /// Types the rest of the word.
        case completion
        /// Replaces the typed word with another word, such as "recieve"
        /// with "receive".
        case correction
        /// Replaces the typed word with an emoji.
        case emoji
        /// Types the word that comes next.
        case next
    }

    /// The full word, with the letters that the user typed in the case that
    /// the user typed them.
    public let word: String
    /// The letters that the field already holds. Empty for a next word.
    public let partial: String
    /// True when a space goes before the word, as after a mark with no
    /// space.
    public let spaceBefore: Bool
    public let kind: Kind

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
        kind = .completion
    }

    /// A word or an emoji that replaces the whole typed word, or `nil` when
    /// it is the typed word.
    public init?(replacing partial: String, with word: String, isEmoji: Bool) {
        guard !partial.isEmpty, !word.isEmpty, word.lowercased() != partial.lowercased() else { return nil }
        self.word = word
        self.partial = partial
        spaceBefore = false
        kind = isEmoji ? .emoji : .correction
    }

    /// The word that comes next, or `nil` when `word` has no letter.
    public init?(nextWord word: String, spaceBefore: Bool) {
        guard word.contains(where: \.isLetter) else { return nil }
        self.word = word
        partial = ""
        self.spaceBefore = spaceBefore
        kind = .next
    }

    /// The characters of the typed word that go before the text is typed:
    /// all of them for a correction or an emoji, none for a completion.
    public var deleteCount: Int {
        switch kind {
        case .correction, .emoji: partial.count
        case .completion, .next: 0
        }
    }

    /// The label that VoiceOver and Switch Control speak.
    public var spokenLabel: String {
        kind == .correction ? "Correct to \(word)" : word
    }

    /// The text to type after the deletes: the rest of the word, or the
    /// whole word of a correction, and a space. A space comes first when
    /// `spaceBefore` is true.
    public var textToType: String {
        let rest = deleteCount > 0 ? word : String(word.dropFirst(partial.count))
        return (spaceBefore ? " " : "") + rest + " "
    }
}

/// One candidate of macOS: its text, and true when it is an emoji.
public struct WordCandidate: Equatable, Sendable {
    public var text: String
    public var isEmoji: Bool

    public init(_ text: String, isEmoji: Bool = false) {
        self.text = text
        self.isEmoji = isEmoji
    }
}

/// The text and the caret that go to the spell checker of macOS: the
/// paragraph of the caret, as the Apple Accessibility Keyboard sends it. The
/// words after the caret help the candidates.
public struct CandidateRequest: Equatable, Sendable {
    public var text: String
    public var caret: NSRange

    public init(context: PredictionContext) {
        let whole = context.text as NSString
        let caret = NSRange(location: context.caret, length: 0)
        let paragraph = whole.paragraphRange(for: caret)
        var line = whole.substring(with: paragraph)
        while line.hasSuffix("\n") || line.hasSuffix("\r") { line.removeLast() }
        text = line
        self.caret = NSRange(location: context.caret - paragraph.location, length: 0)
    }
}

/// Word completions from the candidates of macOS, the words and the emoji
/// that the QuickType bar shows. macOS learns from the responses that the
/// keyboard records.
@MainActor
public final class CandidateCompleter: WordCompleting {
    /// The most words that the word row asks for. The row shows the words
    /// that fit.
    public static let limit = 20
    /// The result type of an emoji candidate. It is not public in AppKit.
    nonisolated static let emojiResultType: UInt64 = 1 << 14

    private let checker = NSSpellChecker.shared
    private let tag = NSSpellChecker.uniqueSpellDocumentTag()
    private let language: () -> String?

    /// - Parameter language: the language of the input source, or `nil` to
    ///   let macOS find the language.
    public init(language: @escaping () -> String? = { nil }) {
        self.language = language
    }

    public func completions(for context: PredictionContext) async -> [WordCompletion] {
        guard !context.partialWord.isEmpty || context.isBetweenWords else { return [] }
        let request = CandidateRequest(context: context)
        if let language = language() {
            checker.automaticallyIdentifiesLanguages = false
            checker.setLanguage(language)
        } else {
            checker.automaticallyIdentifiesLanguages = true
        }
        let options: [NSSpellChecker.OptionKey: Any] = [
            NSSpellChecker.OptionKey(rawValue: "NSTextCheckingSuppressKeyEventDataKey"): true
        ]
        let candidates: [WordCandidate] = await withCheckedContinuation { continuation in
            _ = checker.requestCandidates(
                forSelectedRange: request.caret, in: request.text, types: NSTextCheckingAllTypes,
                options: options, inSpellDocumentWithTag: tag
            ) { @Sendable _, results in
                // macOS calls this on a queue of its own, not on the main
                // actor of the completer.
                continuation.resume(
                    returning: results.compactMap { result in
                        result.replacementString.map {
                            WordCandidate($0, isEmoji: result.resultType.rawValue == Self.emojiResultType)
                        }
                    })
            }
        }
        return Self.completions(from: candidates, for: context)
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
    /// partial word, a candidate that starts with it completes it, another
    /// word corrects it, and an emoji replaces it. The candidate that repeats
    /// the partial is none of these. Between words, they are next words, with
    /// a space before the word when the candidate starts with one.
    public static func completions(
        from candidates: [WordCandidate], for context: PredictionContext
    ) -> [WordCompletion] {
        let partial = context.partialWord
        var seen = Set<String>()
        return candidates
            .compactMap { candidate -> WordCompletion? in
                let word = candidate.text.trimmingCharacters(in: .whitespaces)
                if partial.isEmpty {
                    return WordCompletion(nextWord: word, spaceBefore: candidate.text.first == " ")
                }
                if !candidate.isEmoji, let completion = WordCompletion(word: word, partial: partial) {
                    return completion
                }
                guard candidate.isEmoji || !word.lowercased().hasPrefix(partial.lowercased()) else { return nil }
                return WordCompletion(replacing: partial, with: word, isEmoji: candidate.isEmoji)
            }
            .filter { seen.insert($0.word.lowercased()).inserted }
            .prefix(limit)
            .map { $0 }
    }
}
