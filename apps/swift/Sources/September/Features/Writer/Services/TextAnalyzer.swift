import Foundation
import NaturalLanguage

// MARK: - TextAnalyzer
//
// Static methods for text analysis:
//   - Part-of-speech tagging (NLTagger)
//   - Filler word detection
//   - Cliché phrase detection
//   - Redundancy detection
//
// All methods are pure functions operating on String input.
// No state, no side effects — safe to call from any context.

enum TextAnalyzer {

    // MARK: - Part of Speech

    enum SpeechCategory: String, Sendable {
        case adjective
        case noun
        case adverb
        case verb
        case conjunction
    }

    struct TaggedWord: Sendable {
        let range: NSRange
        let word: String
        let category: SpeechCategory
    }

    /// Tag parts of speech using NLTagger.
    /// Returns tagged words for: adjectives, nouns, adverbs, verbs, conjunctions.
    static func tagPartsOfSpeech(in text: String) -> [TaggedWord] {
        guard !text.isEmpty else { return [] }

        let tagger = NLTagger(tagSchemes: [.lexicalClass])
        tagger.string = text

        var results: [TaggedWord] = []

        tagger.enumerateTags(
            in: text.startIndex..<text.endIndex,
            unit: .word,
            scheme: .lexicalClass,
            options: [.omitPunctuation, .omitWhitespace]
        ) { tag, tokenRange in
            guard let tag else { return true }

            let category: SpeechCategory?
            switch tag {
            case .adjective: category = .adjective
            case .noun: category = .noun
            case .adverb: category = .adverb
            case .verb: category = .verb
            case .conjunction: category = .conjunction
            default: category = nil
            }

            if let category {
                let word = String(text[tokenRange])
                let nsRange = NSRange(tokenRange, in: text)
                results.append(TaggedWord(range: nsRange, word: word, category: category))
            }
            return true
        }

        return results
    }

    // MARK: - Filler Words

    private static let fillerWords: Set<String> = [
        "basically", "actually", "just", "really", "very", "quite",
        "somewhat", "perhaps", "maybe", "literally", "honestly",
        "frankly", "simply", "certainly", "definitely", "probably",
        "seemingly", "apparently", "practically", "virtually",
    ]

    /// Find filler words in text. Returns NSRange array.
    static func findFillers(in text: String) -> [NSRange] {
        findWords(from: fillerWords, in: text)
    }

    // MARK: - Clichés

    private static let clichePhrases: [String] = [
        "at the end of the day", "it is what it is", "think outside the box",
        "low hanging fruit", "move the needle", "circle back",
        "hit the ground running", "take it to the next level",
        "on the same page", "at this point in time", "few and far between",
        "the fact of the matter", "in the nick of time", "easier said than done",
        "better late than never", "actions speak louder than words",
        "last but not least", "only time will tell", "a blessing in disguise",
    ]

    /// Find cliché phrases in text. Returns NSRange array.
    static func findCliches(in text: String) -> [NSRange] {
        findPhrases(from: clichePhrases, in: text)
    }

    // MARK: - Redundancies

    private static let redundantPhrases: [String] = [
        "end result", "free gift", "past history", "future plans",
        "completely unanimous", "basic fundamentals", "close proximity",
        "each and every", "first and foremost", "true fact",
        "advance planning", "added bonus", "brief summary",
        "completely destroyed", "final outcome", "general consensus",
        "new innovation", "over exaggerate", "past experience",
        "revert back", "unexpected surprise", "completely eliminate",
    ]

    /// Find redundant phrases in text. Returns NSRange array.
    static func findRedundancies(in text: String) -> [NSRange] {
        findPhrases(from: redundantPhrases, in: text)
    }

    // MARK: - Private Helpers

    /// Find whole-word matches from a set, case-insensitive.
    private static func findWords(from wordSet: Set<String>, in text: String) -> [NSRange] {
        var results: [NSRange] = []
        let nsText = text as NSString
        let lower = text.lowercased()

        for word in wordSet {
            var searchStart = lower.startIndex
            while let range = lower.range(of: word, range: searchStart..<lower.endIndex) {
                // Check word boundaries
                let before = range.lowerBound == lower.startIndex
                    || !lower[lower.index(before: range.lowerBound)].isLetter
                let after = range.upperBound == lower.endIndex
                    || !lower[range.upperBound].isLetter

                if before && after {
                    let nsRange = NSRange(range, in: text)
                    results.append(nsRange)
                }
                searchStart = range.upperBound
            }
            _ = nsText  // silence unused warning
        }

        return results
    }

    /// Find phrase matches, case-insensitive.
    private static func findPhrases(from phrases: [String], in text: String) -> [NSRange] {
        var results: [NSRange] = []
        let lower = text.lowercased()

        for phrase in phrases {
            var searchStart = lower.startIndex
            while let range = lower.range(of: phrase, range: searchStart..<lower.endIndex) {
                let nsRange = NSRange(range, in: text)
                results.append(nsRange)
                searchStart = range.upperBound
            }
        }

        return results
    }
}
