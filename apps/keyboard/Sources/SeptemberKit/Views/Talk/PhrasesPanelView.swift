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
                ShortcutButtonView(button: button, width: width) { press(button.action) }
            }
        }
        .frame(width: Metrics.Keypad.width)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Phrases")
    }
}
