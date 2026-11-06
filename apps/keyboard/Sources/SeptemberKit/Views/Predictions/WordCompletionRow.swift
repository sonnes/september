import SwiftUI

/// Completions for the word at the caret, at the top of the keys. The best
/// match comes first, in the accent colour. Empty slots keep the row in
/// place when there is no word to complete.
public struct WordCompletionRow: View {
    @ObservedObject private var engine: PredictionEngine
    private let onType: (String) -> Void

    /// - Parameter onType: Types the rest of the pressed word and a space.
    public init(engine: PredictionEngine, onType: @escaping (String) -> Void) {
        self.engine = engine
        self.onType = onType
    }

    public var body: some View {
        if engine.wordsEnabled {
            HStack(spacing: Metrics.Predictions.wordSpacing) {
                ForEach(0..<Metrics.Predictions.wordSlots, id: \.self) { index in
                    if engine.words.indices.contains(index) {
                        WordButton(completion: engine.words[index], isBest: index == 0, onType: onType)
                    } else {
                        EmptyWordSlot()
                    }
                }
            }
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
    let onType: (String) -> Void

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
                onType(completion.textToType)
            }
    }
}

private struct EmptyWordSlot: View {
    var body: some View {
        RoundedRectangle(cornerRadius: Metrics.Predictions.wordCornerRadius, style: .continuous)
            .strokeBorder(
                Color(Tokens.strokeStandard),
                style: StrokeStyle(
                    lineWidth: Metrics.Predictions.strokeWidth, dash: Metrics.Predictions.emptySlotDash))
            .frame(maxWidth: .infinity, minHeight: Metrics.Predictions.wordHeight)
            .accessibilityHidden(true)
    }
}
