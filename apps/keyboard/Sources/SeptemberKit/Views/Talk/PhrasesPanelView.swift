import SwiftUI

/// The Phrases panel at the left of the keys in Talk mode. A press types the
/// phrase into the Talk bar.
public struct PhrasesPanelView: View {
    private let panel: PanelDefinition
    private let press: (PanelAction) -> Void

    public init(panel: PanelDefinition, press: @escaping (PanelAction) -> Void) {
        self.panel = panel
        self.press = press
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Metrics.Panel.titleSpacing) {
            SectionLabel(text: panel.title)
            KeypadGrid(rows: KeypadRow.rows(panel.buttons, columns: panel.columns), columns: panel.columns) {
                button, width in
                PhraseButton(button: button, width: width) { press(button.action) }
            }
        }
        .frame(width: Metrics.Keypad.width)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Phrases")
    }
}

private struct PhraseButton: View {
    let button: PanelButton
    let width: CGFloat
    let press: () -> Void

    @State private var isPressed = false

    var body: some View {
        let shape = RoundedRectangle(
            cornerRadius: Metrics.Keypad.cornerRadius, style: .continuous)
        Text(button.label)
            .font(Typography.shortcutText)
            .foregroundStyle(Color(Tokens.keyText))
            .lineLimit(1)
            .frame(width: width, height: Metrics.Keypad.buttonHeight)
            .background(shape.fill(Color(isPressed ? Tokens.key.pressed : Tokens.key)))
            .overlay(shape.strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1))
            .pressable(
                label: button.accessibilityLabel,
                trigger: .down(KeyHold(behavior: { [action = button.action] in action.holdBehavior }))
            ) { isPressed = $0 } action: {
                press()
            }
    }
}
