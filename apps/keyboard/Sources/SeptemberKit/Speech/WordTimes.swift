import Foundation

/// A word of the spoken text and the time that the voice starts it.
public struct TimedWord: Equatable, Sendable {
    /// UTF-16 range in the spoken text, as `NSString` counts it.
    public let range: NSRange
    /// Seconds from the start of the audio.
    public let start: Double

    public init(range: NSRange, start: Double) {
        self.range = range
        self.start = start
    }
}

/// The words of a text in order, with their start times.
public struct WordTimes: RandomAccessCollection, Equatable, Sendable {
    private let words: [TimedWord]

    public init(_ words: [TimedWord]) {
        self.words = words
    }

    /// The words of `text` with the times of the ElevenLabs alignment.
    ///
    /// ElevenLabs sends one start time for each character it read. The
    /// characters can differ from the text, so the words match by their
    /// order, not by their offsets. A word with no time is left out.
    public init(text: String, characters: [String], starts: [Double]) {
        var times: [Double] = []
        var inWord = false
        for (character, start) in zip(characters, starts) {
            let space = character.allSatisfy(\.isWhitespace)
            if !space, !inWord { times.append(start) }
            inWord = !space
        }
        self.init(zip(Self.wordRanges(in: text), times).map { TimedWord(range: $0, start: $1) })
    }

    /// The ranges of the runs of text between whitespace.
    static func wordRanges(in text: String) -> [NSRange] {
        var ranges: [NSRange] = []
        var start: String.Index?
        for index in text.indices {
            if text[index].isWhitespace {
                if let begin = start { ranges.append(NSRange(begin..<index, in: text)) }
                start = nil
            } else if start == nil {
                start = index
            }
        }
        if let begin = start { ranges.append(NSRange(begin..<text.endIndex, in: text)) }
        return ranges
    }

    /// The word that the voice speaks at `time`: the last word that has started.
    public func word(at time: Double) -> NSRange? {
        words.last { $0.start <= time }?.range
    }

    public var startIndex: Int { words.startIndex }
    public var endIndex: Int { words.endIndex }
    public subscript(position: Int) -> TimedWord { words[position] }
}
