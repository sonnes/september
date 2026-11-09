import SwiftUI

/// The shortcuts of the app in front, in the place of the sentence
/// predictions. The best row is next to the input bar, as in the prediction
/// stack. Each tile shows the keys and the name of a shortcut, and a press
/// presses the keys in the app.
public struct ShortcutSuggestions: View {
    private let shortcuts: [AppShortcut]
    private let onPress: (AppShortcut) -> Void

    public init(shortcuts: [AppShortcut], onPress: @escaping (AppShortcut) -> Void) {
        self.shortcuts = shortcuts
        self.onPress = onPress
    }

    public var body: some View {
        let fit = ShortcutRowsFit(
            widths: shortcuts.map(Typography.shortcutSuggestionWidth), width: Metrics.keyboardWidth,
            rows: Metrics.Predictions.shortcutRows, spacing: Metrics.Predictions.tileSpacing)
        VStack(alignment: .leading, spacing: Metrics.Predictions.rowSpacing) {
            // The best row is last, next to the input bar.
            ForEach(Array(fit.rows.enumerated().reversed()), id: \.offset) { _, row in
                HStack(spacing: Metrics.Predictions.tileSpacing) {
                    ForEach(row, id: \.self) { index in
                        ShortcutTile(shortcut: shortcuts[index]) { onPress(shortcuts[index]) }
                    }
                }
                .accessibilityElement(children: .contain)
            }
        }
        .frame(
            width: Metrics.keyboardWidth, height: Metrics.Predictions.stackHeight,
            alignment: .bottomLeading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Shortcuts")
    }
}

/// One shortcut: its keys, then its name. It acts when the button goes down,
/// as a panel button does.
private struct ShortcutTile: View {
    let shortcut: AppShortcut
    let press: () -> Void

    @State private var pressed = false
    @State private var hovered = false

    var body: some View {
        let lit = pressed || hovered
        HStack(spacing: Metrics.Predictions.shortcutKeysGap) {
            Text(shortcut.shortcut.display)
                .font(Typography.shortcutSuggestionKeys)
                .foregroundStyle(Color(Tokens.shortcutLabel))
            Text(shortcut.name)
                .font(Typography.predictionTile)
                .foregroundStyle(Color(Tokens.keyText))
        }
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
                    Color(lit ? Tokens.accent : Tokens.strokeStandard), lineWidth: Metrics.Predictions.strokeWidth)
        )
        .shadow(color: Color(Tokens.keyShadow), radius: 1, y: 1)
        .onHover { hovered = $0 }
        .pressable(
            label: shortcut.accessibilityLabel, trigger: .down(.once), onPressing: { pressed = $0 }, action: press)
    }
}
