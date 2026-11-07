import CoreGraphics

/// The words that fit in the word row, and the width of each button.
///
/// Each button is as wide as its word and `wordPadding` at each side, and at
/// least `wordMinWidth`. The words go in their order, best first. A word that
/// does not fit is left out, and a shorter word after it can take its place.
/// When a word was left out, or the space at the end is too small for a
/// button, the buttons share that space and the row is full. Otherwise one
/// empty slot fills the end of the row.
public struct WordRowFit: Equatable, Sendable {
    /// The positions in `words` of the words that show.
    public let indices: [Int]
    /// The width of the button of each word that shows.
    public let widths: [CGFloat]
    /// The width of the empty slot at the end, or `nil` when the row is full.
    public let emptyWidth: CGFloat?

    /// - Parameter measure: the width of a word, in the font of the best word
    ///   when the flag is true.
    public init(words: [String], width: CGFloat, measure: (String, Bool) -> CGFloat) {
        let spacing = Metrics.Predictions.wordSpacing
        var indices: [Int] = []
        var widths: [CGFloat] = []
        var used: CGFloat = 0
        var leftOut = false
        for (index, word) in words.enumerated() {
            let ideal = max(
                Metrics.Predictions.wordMinWidth,
                (measure(word, index == 0) + Metrics.Predictions.wordPadding * 2).rounded(.up))
            let needed = (indices.isEmpty ? 0 : spacing) + ideal
            guard used + needed <= width else {
                leftOut = true
                continue
            }
            indices.append(index)
            widths.append(ideal)
            used += needed
        }

        let slot = width - used - (indices.isEmpty ? 0 : spacing)
        if indices.isEmpty || (!leftOut && slot >= Metrics.Predictions.wordMinWidth) {
            emptyWidth = max(0, indices.isEmpty ? width : slot)
        } else {
            let share = (width - used) / CGFloat(widths.count)
            widths = widths.map { $0 + share }
            emptyWidth = nil
        }
        self.indices = indices
        self.widths = widths
    }
}
