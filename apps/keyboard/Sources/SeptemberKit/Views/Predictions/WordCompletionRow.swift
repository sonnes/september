import SwiftUI

/// Completions for the word at the caret, or the next words between words,
/// at the top of the keys. The best match comes first, in the accent colour.
/// Empty slots keep the row in place when there are no words.
public struct WordCompletionRow: View {
    @ObservedObject private var engine: PredictionEngine
    private let onPick: (WordCompletion) -> Void

    /// - Parameter onPick: Types the rest of the pressed word and a space.
    public init(engine: PredictionEngine, onPick: @escaping (WordCompletion) -> Void) {
        self.engine = engine
        self.onPick = onPick
    }

    public var body: some View {
        if engine.wordsEnabled {
            GeometryReader { geometry in
                let words = engine.words
                let fit = WordRowFit(words: words.map(\.word), width: geometry.size.width, measure: Typography.wordWidth)
                HStack(spacing: Metrics.Predictions.wordSpacing) {
                    ForEach(Array(zip(fit.indices, fit.widths)), id: \.0) { index, width in
                        WordButton(completion: words[index], isBest: index == 0, onPick: onPick)
                            .frame(width: width)
                    }
                    if let empty = fit.emptyWidth, empty > 0 {
                        EmptyWordSlot().frame(width: empty)
                    }
                }
            }
            .frame(height: Metrics.Predictions.wordHeight)
            .padding(.bottom, Metrics.Predictions.wordRowLinePadding)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(Color(Tokens.panelStroke))
                    .frame(height: Metrics.Predictions.strokeWidth)
            }
            .padding(.bottom, Metrics.Predictions.wordRowBottomSpacing)
        }
    }
}

private struct WordButton: View {
    let completion: WordCompletion
    let isBest: Bool
    let onPick: (WordCompletion) -> Void

    @State private var pressed = false

    var body: some View {
        Text(completion.word)
            .font(isBest ? Typography.wordCompletionBest : Typography.wordCompletion)
            .foregroundStyle(Color(isBest ? Tokens.accent : Tokens.keyText))
            .lineLimit(1)
            .frame(maxWidth: .infinity, minHeight: Metrics.Predictions.wordHeight)
            .background(
                RoundedRectangle(cornerRadius: Metrics.Predictions.wordCornerRadius, style: .continuous)
                    .fill(Color(pressed ? Tokens.keyActive : Tokens.key))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Metrics.Predictions.wordCornerRadius, style: .continuous)
                    .strokeBorder(Color(Tokens.strokeStandard), lineWidth: Metrics.Predictions.strokeWidth)
            )
            .pressable(label: completion.word, trigger: .down(.once), onPressing: { pressed = $0 }) {
                onPick(completion)
            }
    }
}

private struct EmptyWordSlot: View {
    var body: some View {
        RoundedRectangle(cornerRadius: Metrics.Predictions.wordCornerRadius, style: .continuous)
            .strokeBorder(
                Color(Tokens.strokeStandard),
                style: StrokeStyle(
                    lineWidth: Metrics.Predictions.strokeWidth, dash: Metrics.emptySlotDash))
            .frame(maxWidth: .infinity, minHeight: Metrics.Predictions.wordHeight)
            .accessibilityHidden(true)
    }
}
