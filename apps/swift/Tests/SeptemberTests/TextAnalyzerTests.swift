import Testing

@testable import September

@Suite("TextAnalyzer")
struct TextAnalyzerTests {

    // MARK: - Filler Words

    @Test("Detects filler words")
    func detectFillers() {
        let ranges = TextAnalyzer.findFillers(in: "I basically just wanted to actually try this really quickly")
        let words = ranges.map {
            String("I basically just wanted to actually try this really quickly"[
                Range($0, in: "I basically just wanted to actually try this really quickly")!
            ])
        }
        #expect(words.contains("basically"))
        #expect(words.contains("just"))
        #expect(words.contains("actually"))
        #expect(words.contains("really"))
    }

    @Test("No fillers in clean text")
    func noFillers() {
        let ranges = TextAnalyzer.findFillers(in: "The cat sat on the mat.")
        #expect(ranges.isEmpty)
    }

    @Test("Filler detection is case insensitive")
    func fillersCaseInsensitive() {
        let text = "Basically this is JUST a test"
        let ranges = TextAnalyzer.findFillers(in: text)
        #expect(ranges.count >= 2)
    }

    // MARK: - Clichés

    @Test("Detects cliché phrases")
    func detectCliches() {
        let text = "At the end of the day, it is what it is."
        let ranges = TextAnalyzer.findCliches(in: text)
        #expect(!ranges.isEmpty)
    }

    @Test("No clichés in clean text")
    func noCliches() {
        let ranges = TextAnalyzer.findCliches(in: "The weather was pleasant today.")
        #expect(ranges.isEmpty)
    }

    // MARK: - Redundancies

    @Test("Detects redundant phrases")
    func detectRedundancies() {
        let text = "The end result was completely unanimous."
        let ranges = TextAnalyzer.findRedundancies(in: text)
        #expect(!ranges.isEmpty)
    }

    // MARK: - Part of Speech

    @Test("Tags parts of speech")
    func partsOfSpeech() {
        let tags = TextAnalyzer.tagPartsOfSpeech(in: "The quick brown fox jumps over the lazy dog")
        #expect(!tags.isEmpty)
        // Should find at least adjectives (quick, brown, lazy) and nouns (fox, dog)
        let hasAdjective = tags.contains { $0.category == .adjective }
        let hasNoun = tags.contains { $0.category == .noun }
        let hasVerb = tags.contains { $0.category == .verb }
        #expect(hasAdjective)
        #expect(hasNoun)
        #expect(hasVerb)
    }

    @Test("Empty text returns no tags")
    func emptyPartsOfSpeech() {
        let tags = TextAnalyzer.tagPartsOfSpeech(in: "")
        #expect(tags.isEmpty)
    }
}
