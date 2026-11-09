import SwiftUI

/// Section heading used above each group of shortcuts.
struct SectionLabel: View {
    let text: String

    var body: some View {
        Text(text)
            .textCase(.uppercase)
            .font(Typography.sectionLabel)
            .tracking(Typography.sectionTracking)
            .foregroundStyle(Color(Tokens.sectionLabel))
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }
}

/// A keypad: the Text and System keypads. Each button takes one cell
/// of the grid. The arrows of a keypad, if it has them, sit below the grid
/// in columns of their own.
public struct PanelGridView: View {
    private let panel: PanelDefinition
    private let width: CGFloat
    private let press: (PanelAction) -> Void

    public init(
        panel: PanelDefinition,
        width: CGFloat = Metrics.Keypad.width,
        press: @escaping (PanelAction) -> Void
    ) {
        self.panel = panel
        self.width = width
        self.press = press
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Metrics.Panel.titleSpacing) {
            SectionLabel(text: panel.title)
                .frame(height: Metrics.Panel.titleHeight)
            VStack(spacing: Metrics.Keypad.gap) {
                grid(panel.buttons, columns: panel.columns)
                if let arrows = panel.arrows {
                    grid(arrows.buttons, columns: arrows.columns)
                }
            }
        }
        .frame(width: width)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(panel.title) shortcuts")
    }

    private func grid(_ buttons: [PanelButton], columns: Int) -> some View {
        let spacing = Metrics.Keypad.gap
        let columns = max(columns, 1)
        let buttonWidth = (width - spacing * CGFloat(columns - 1)) / CGFloat(columns)
        return LazyVGrid(
            columns: Array(repeating: GridItem(.fixed(buttonWidth), spacing: spacing), count: columns),
            spacing: spacing
        ) {
            ForEach(buttons) { button in
                ShortcutButtonView(button: button, width: buttonWidth, showsIcon: true) {
                    press(button.action)
                }
            }
        }
    }
}

/// The keys of Write in a grid of two columns and six rows. A text button
/// takes a whole row. Empty slots keep the grid as tall on the desk as on the
/// paper.
public struct WritePanelGrid: View {
    private let panel: PanelDefinition
    private let width: CGFloat
    private let press: (PanelAction) -> Void

    public init(
        panel: PanelDefinition,
        width: CGFloat = Metrics.Keypad.width,
        press: @escaping (PanelAction) -> Void
    ) {
        self.panel = panel
        self.width = width
        self.press = press
    }

    public var body: some View {
        let gap = Metrics.Keypad.gap
        let cell = (width - gap) / CGFloat(PanelLayout.columns)
        let rows = PanelLayout.rows(PanelLayout.fitting(panel.buttons))

        VStack(alignment: .leading, spacing: gap) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(spacing: gap) {
                    ForEach(row) { button in
                        ShortcutButtonView(button: button, width: button.isText ? width : cell) {
                            press(button.action)
                        }
                    }
                    if row.count == 1, !row[0].isText {
                        EmptySlotView(width: cell)
                    }
                }
            }
            ForEach(rows.count..<max(Metrics.Keypad.rows, rows.count), id: \.self) { _ in
                HStack(spacing: gap) {
                    EmptySlotView(width: cell)
                    EmptySlotView(width: cell)
                }
            }
        }
        .frame(width: width, alignment: .leading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(panel.title) shortcuts")
    }
}
