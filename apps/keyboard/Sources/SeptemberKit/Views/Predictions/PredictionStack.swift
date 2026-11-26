import AppKit
import SwiftUI

/// The sentence predictions above the input bar, in two columns: the
/// history rows at the left and the model rows at the right. The best row of
/// each column is next to the bar. Each place keeps its height, so a row
/// does not move when another row leaves. The stack has no background.
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
                HStack(alignment: .bottom, spacing: Metrics.Predictions.columnSpacing) {
                    column(engine.historyRows)
                    column(engine.modelRows)
                }
            }
        }
        .frame(
            width: Metrics.keyboardWidth, height: Metrics.Predictions.stackHeight,
            alignment: .bottomLeading)
    }

    /// Each column starts at its left edge, so the icons of its rows line up.
    private func column(_ rows: [PredictionStripe?]) -> some View {
        VStack(alignment: .leading, spacing: Metrics.Predictions.rowSpacing) {
            // The best place is last, next to the input bar.
            ForEach((0..<SuggestionPrompt.count).reversed(), id: \.self) { index in
                if index < rows.count, let stripe = rows[index] {
                    PredictionRow(stripe: stripe, mode: mode, onType: onType)
                } else {
                    Color.clear.frame(height: Metrics.Predictions.tileHeight)
                }
            }
        }
        .frame(width: Metrics.Predictions.columnWidth, alignment: .bottomLeading)
        .accessibilityElement(children: .contain)
    }
}

/// One prediction: the icon of its source, in Type mode a lead-in mark for
/// the words that the field holds, and then one tile for each word. The row
/// shows the most tiles that fit in its column.
struct PredictionRow: View {
    let stripe: PredictionStripe
    let mode: PredictionMode
    let onType: (String) -> Void

    var body: some View {
        HStack(spacing: Metrics.Predictions.iconSpacing) {
            Text(stripe.source.icon)
                .font(Typography.predictionSourceIcon)
                .foregroundStyle(Color(stripe.source.iconColor))
                .accessibilityHidden(true)
            ViewThatFits(in: .horizontal) {
                ForEach((1...max(stripe.tiles.count, 1)).reversed(), id: \.self) { count in
                    tiles(count)
                }
            }
        }
        .accessibilityElement(children: .contain)
    }

    private func tiles(_ count: Int) -> some View {
        HStack(spacing: Metrics.Predictions.tileSpacing) {
            if stripe.showsLeadIn(in: mode) {
                Text("…")
                    .font(Typography.predictionLeadIn)
                    .foregroundStyle(Color(Tokens.keyText))
                    .opacity(Metrics.Predictions.leadInOpacity)
                    .padding(.horizontal, Metrics.Predictions.leadInPadding)
                    .accessibilityHidden(true)
            }
            ForEach(Array(stripe.tiles.prefix(count).enumerated()), id: \.offset) { index, word in
                PredictionTile(
                    word: word,
                    label: stripe.spokenLabel(through: index),
                    text: stripe.text(toTypeThrough: index),
                    source: stripe.source,
                    onType: onType)
            }
        }
    }
}

extension PredictionSource {
    /// The mark at the start of a row: ↺ for a sentence said before, ✦ for
    /// a suggestion of the model.
    var icon: String {
        switch self {
        case .history: "\u{21BA}"
        case .model: "\u{2726}"
        }
    }

    var iconColor: ThemeColor {
        switch self {
        case .history: Tokens.historyRowIcon
        case .model: Tokens.modelRowIcon
        }
    }

    var fill: ThemeColor {
        switch self {
        case .history: Tokens.historyRowFill
        case .model: Tokens.modelRowFill
        }
    }

    var stroke: ThemeColor {
        switch self {
        case .history: Tokens.historyRowStroke
        case .model: Tokens.modelRowStroke
        }
    }
}

/// A word of a prediction. A press types the sentence up to this word. A
/// tile with no text to type, because its row no longer continues the field,
/// is not active.
struct PredictionTile: View {
    let word: String
    let label: String
    let text: String?
    let source: PredictionSource
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
                    .overlay(
                        RoundedRectangle(cornerRadius: Metrics.Predictions.tileCornerRadius, style: .continuous)
                            .fill(Color(source.fill)))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Metrics.Predictions.tileCornerRadius, style: .continuous)
                    .strokeBorder(
                        Color(lit ? Tokens.accent : source.stroke),
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
