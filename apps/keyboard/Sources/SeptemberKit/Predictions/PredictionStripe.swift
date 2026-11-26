import Foundation

/// Where a row of the stack comes from.
public enum PredictionSource: Equatable, Sendable {
    /// A sentence that the user sent before, from `SentenceHistory`.
    case history
    /// A sentence from Apple Intelligence.
    case model

    /// The start of the spoken label of each tile, so that the source does
    /// not depend on colour only.
    public var spokenName: String {
        switch self {
        case .history: "Said before"
        case .model: "Suggested"
        }
    }
}

/// One sentence prediction as a row of word tiles. A press on a tile types the
/// sentence up to that word.
///
/// The row hides the words that the field already holds. A partial word at
/// the caret shows as its full tile, and a press types only the rest of it.
/// This follows the stripe rules of `packages/core/rules/stripes.ts`.
public struct PredictionStripe: Equatable, Sendable {
    public static let maxTiles = 6

    public let prediction: String
    public let source: PredictionSource
    public let tiles: [String]
    /// The count of words that the field already holds. In Type mode the
    /// row shows a lead-in mark in their place.
    public let hidden: Int
    /// False when the prediction does not continue the text in the field. The
    /// tiles of such a row are not active.
    public let matches: Bool

    /// The typed letters of the first tile.
    private let partial: String
    /// The text that goes before the first tile: a space when the field ends
    /// with a full word.
    private let lead: String

    public init(prediction: String, typed: String, source: PredictionSource = .model) {
        let words = Self.words(prediction)
        var fieldWords = Self.words(typed)
        let endsWithSpace = typed.last.map(\.isWhitespace) ?? true
        let partial = endsWithSpace ? "" : fieldWords.popLast() ?? ""

        guard let overlap = Self.overlap(of: fieldWords, partial: partial, with: words) else {
            self.init(
                prediction: prediction, source: source, tiles: Self.row(words), hidden: 0, partial: "", lead: "",
                matches: false)
            return
        }

        // A partial that is the whole next word is a word that the field holds.
        if !partial.isEmpty, overlap < words.count, words[overlap].lowercased() == partial.lowercased() {
            self.init(
                prediction: prediction, source: source, tiles: Self.row(Array(words[(overlap + 1)...])),
                hidden: overlap + 1, partial: "", lead: " ", matches: true)
            return
        }
        self.init(
            prediction: prediction, source: source, tiles: Self.row(Array(words[overlap...])),
            hidden: overlap, partial: partial, lead: "", matches: true)
    }

    private init(
        prediction: String, source: PredictionSource, tiles: [String], hidden: Int, partial: String, lead: String,
        matches: Bool
    ) {
        self.prediction = prediction
        self.source = source
        self.tiles = tiles
        self.hidden = hidden
        self.partial = partial
        self.lead = lead
        self.matches = matches
    }

    /// The text to type for a press on the tile at `index`, with a space at
    /// the end. It is `nil` when the row does not match the field.
    public func text(toTypeThrough index: Int) -> String? {
        guard matches, tiles.indices.contains(index) else { return nil }
        let words = tiles[...index].joined(separator: " ")
        return lead + String(words.dropFirst(partial.count)) + " "
    }

    /// True when the row shows the lead-in mark before its tiles. Talk mode
    /// shows none, as in frame 4 of the mock: the Talk bar is next to the
    /// row, so the hidden words are plain to see.
    public func showsLeadIn(in mode: PredictionMode) -> Bool {
        mode == .type && hidden > 0
    }

    /// The words of the row up to the tile at `index`.
    public func words(through index: Int) -> String {
        guard tiles.indices.contains(index) else { return "" }
        return tiles[...index].joined(separator: " ")
    }

    /// The spoken label of the tile at `index`: the source, then the words
    /// of the row up to the tile.
    public func spokenLabel(through index: Int) -> String {
        "\(source.spokenName): \(words(through: index))"
    }

    // MARK: - Matching

    private static func words(_ text: String) -> [String] {
        text.split(whereSeparator: \.isWhitespace).map(String.init)
    }

    /// The count of leading prediction words that repeat the last full words
    /// of the field. The longest overlap wins. A prediction that repeats no
    /// words matches only an empty field or a field that ends a sentence.
    private static func overlap(of field: [String], partial: String, with words: [String]) -> Int? {
        for count in stride(from: min(field.count, words.count), through: 0, by: -1) {
            let tail = field.suffix(count).map { $0.lowercased() }
            let head = words.prefix(count).map { $0.lowercased() }
            guard tail == head else { continue }
            if count == 0, let last = field.last, !endsSentence(last) { return nil }
            if partial.isEmpty { return count }
            if count < words.count, words[count].lowercased().hasPrefix(partial.lowercased()) {
                return count
            }
        }
        return nil
    }

    /// The tiles of a row: up to the end of the first sentence, and no more
    /// than `maxTiles`.
    private static func row(_ words: [String]) -> [String] {
        var tiles: [String] = []
        for word in words.prefix(maxTiles) {
            tiles.append(word)
            if endsSentence(word) { break }
        }
        return tiles
    }

    private static func endsSentence(_ word: String) -> Bool {
        let trimmed = word.trimmingCharacters(in: CharacterSet(charactersIn: "\"')\u{201D}\u{2019}"))
        return trimmed.last.map { ".!?".contains($0) } ?? false
    }
}
