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
        let spacing = Metrics.Talk.phraseSpacing
        let columns = max(panel.columns, 1)
        let width = Metrics.Talk.phrasesWidth
        let buttonWidth = (width - spacing * CGFloat(columns - 1)) / CGFloat(columns)

        VStack(alignment: .leading, spacing: Metrics.Panel.titleSpacing) {
            SectionLabel(text: panel.title)
            LazyVGrid(
                columns: Array(
                    repeating: GridItem(.fixed(buttonWidth), spacing: spacing), count: columns),
                spacing: spacing
            ) {
                ForEach(panel.buttons) { button in
                    PhraseButton(button: button) { press(button.action) }
                }
            }
        }
        .frame(width: width)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Phrases")
    }
}

private struct PhraseButton: View {
    let button: PanelButton
    let press: () -> Void

    @State private var isPressed = false

    var body: some View {
        let shape = RoundedRectangle(
            cornerRadius: Metrics.Talk.buttonCornerRadius, style: .continuous)
        Text(button.label)
            .font(Typography.phraseText)
            .foregroundStyle(Color(Tokens.keyText))
            .lineLimit(1)
            .frame(maxWidth: .infinity)
            .frame(height: Metrics.Talk.phraseHeight)
            .background(shape.fill(Color(isPressed ? Tokens.key.pressed : Tokens.key)))
            .overlay(shape.strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1))
            .pressable(label: button.accessibilityLabel, trigger: .down(.once)) { isPressed = $0 } action: {
                press()
            }
    }
}
