import AppKit
import SwiftUI

/// The three sentence predictions above the input bar. The best row is next
/// to the bar. The stack has no background.
///
/// A notice takes the place of the rows for a password field, for private
/// text, and when Apple Intelligence is not ready.
public struct PredictionStack: View {
    @ObservedObject private var engine: PredictionEngine
    private let mode: PredictionMode
    private let onType: (String) -> Void
    private let onOpenSystemSettings: () -> Void

    /// - Parameters:
    ///   - mode: Type mode shows a lead-in mark for the words that the field
    ///     holds. Talk mode shows none.
    ///   - onType: Types the text of a pressed tile.
    ///   - onOpenSystemSettings: The action of the Apple Intelligence notice.
    public init(
        engine: PredictionEngine,
        mode: PredictionMode,
        onType: @escaping (String) -> Void,
        onOpenSystemSettings: @escaping () -> Void = PredictionNoticeView.openSystemSettings
    ) {
        self.engine = engine
        self.mode = mode
        self.onType = onType
        self.onOpenSystemSettings = onOpenSystemSettings
    }

    public var body: some View {
        Group {
            if let notice = engine.notice {
                PredictionNoticeView(notice: notice, onOpenSystemSettings: onOpenSystemSettings)
            } else {
                VStack(alignment: .leading, spacing: Metrics.Predictions.rowSpacing) {
                    // The best row is last, next to the input bar.
                    ForEach(Array(engine.stripes.enumerated().reversed()), id: \.offset) { _, stripe in
                        PredictionRow(stripe: stripe, mode: mode, onType: onType)
                    }
                }
                .opacity(engine.isStale ? Metrics.Predictions.staleOpacity : 1)
            }
        }
        .frame(
            width: Metrics.keyboardWidth, height: Metrics.Predictions.stackHeight,
            alignment: .bottomLeading)
    }
}

/// One prediction: in Type mode a lead-in mark for the words that the field
/// holds, and then one tile for each word.
struct PredictionRow: View {
    let stripe: PredictionStripe
    let mode: PredictionMode
    let onType: (String) -> Void

    var body: some View {
        HStack(spacing: Metrics.Predictions.tileSpacing) {
            if stripe.showsLeadIn(in: mode) {
                Text("…")
                    .font(Typography.predictionLeadIn)
                    .foregroundStyle(Color(Tokens.keyText))
                    .opacity(Metrics.Predictions.leadInOpacity)
                    .padding(.horizontal, Metrics.Predictions.leadInPadding)
                    .accessibilityHidden(true)
            }
            ForEach(Array(stripe.tiles.enumerated()), id: \.offset) { index, word in
                PredictionTile(
                    word: word,
                    label: stripe.words(through: index),
                    text: stripe.text(toTypeThrough: index),
                    onType: onType)
            }
        }
        .accessibilityElement(children: .contain)
    }
}

/// A word of a prediction. A press types the sentence up to this word. A
/// tile with no text to type, because its row no longer continues the field,
/// is not active.
struct PredictionTile: View {
    let word: String
    let label: String
    let text: String?
    let onType: (String) -> Void

    @State private var pressed = false
    @State private var hovered = false

    var body: some View {
        let lit = text != nil && (pressed || hovered)
        let tile = Text(word)
            .font(Typography.predictionTile)
            .foregroundStyle(Color(Tokens.keyText))
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, Metrics.Predictions.tileHorizontalPadding)
            .frame(height: Metrics.Predictions.tileHeight)
            .background(
                RoundedRectangle(cornerRadius: Metrics.Predictions.tileCornerRadius, style: .continuous)
                    .fill(Color(lit ? Tokens.keyActive : Tokens.key))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Metrics.Predictions.tileCornerRadius, style: .continuous)
                    .strokeBorder(
                        Color(lit ? Tokens.accent : Tokens.strokeStandard),
                        lineWidth: Metrics.Predictions.strokeWidth)
            )
            .shadow(color: Color(Tokens.keyShadow), radius: 1, y: 1)

        if let text {
            tile
                .onHover { hovered = $0 }
                .pressable(label: label, onPressing: { pressed = $0 }) { onType(text) }
        } else {
            tile.accessibilityHidden(true)
        }
    }
}
