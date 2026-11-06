import SwiftUI

/// The accents of a held letter, over the word row. A press on an accent
/// replaces the letter. A press on any key closes the row.
struct AccentRow: View {
    let choices: [String]
    let choose: (String) -> Void

    var body: some View {
        HStack(spacing: Metrics.Predictions.wordSpacing) {
            ForEach(choices, id: \.self) { choice in
                AccentButton(choice: choice) { choose(choice) }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(Tokens.panelBackground))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Accents")
    }
}

private struct AccentButton: View {
    let choice: String
    let choose: () -> Void

    @State private var pressed = false

    var body: some View {
        Text(choice)
            .font(Typography.wordCompletion)
            .foregroundStyle(Color(Tokens.keyText))
            .frame(width: Metrics.Predictions.accentTile, height: Metrics.Predictions.accentTile)
            .background(
                RoundedRectangle(cornerRadius: Metrics.Predictions.wordCornerRadius, style: .continuous)
                    .fill(Color(pressed ? Tokens.keyActive : Tokens.key))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Metrics.Predictions.wordCornerRadius, style: .continuous)
                    .strokeBorder(Color(Tokens.accent), lineWidth: Metrics.Predictions.strokeWidth)
            )
            .pressable(label: choice, trigger: .down(.once), onPressing: { pressed = $0 }, action: choose)
    }
}
