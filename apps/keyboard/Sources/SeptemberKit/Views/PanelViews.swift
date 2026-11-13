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

/// The grid of a keypad, Phrases, Mine, and the Write panels. The cells of a
/// row share the width with the gap of a keypad between them. `cell` draws
/// one cell at the width that it gets.
struct KeypadGrid<Cell, CellView: View>: View {
    let rows: [KeypadRow<Cell>]
    let columns: Int
    var width: CGFloat = Metrics.Keypad.width
    @ViewBuilder let cell: (Cell, CGFloat) -> CellView

    var body: some View {
        let gap = Metrics.Keypad.gap
        let columns = max(columns, 1)
        let cellWidth = (width - gap * CGFloat(columns - 1)) / CGFloat(columns)

        VStack(alignment: .leading, spacing: gap) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                switch row {
                case .wide(let wide):
                    cell(wide, width)
                case .cells(let cells):
                    HStack(spacing: gap) {
                        ForEach(Array(cells.enumerated()), id: \.offset) { _, each in
                            cell(each, cellWidth)
                        }
                    }
                }
            }
        }
        .frame(width: width, alignment: .leading)
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
        KeypadGrid(rows: KeypadRow.rows(buttons, columns: columns), columns: columns, width: width) { button, width in
            ShortcutButtonView(button: button, width: width, showsIcon: true) {
                press(button.action)
            }
        }
    }
}

/// The keys of Write in the grid of `PanelLayout`. A text button takes a
/// whole row. Empty slots keep the grid as tall on the desk as on the paper.
public struct WritePanelGrid: View {
    private let panel: PanelDefinition
    private let press: (PanelAction) -> Void

    public init(panel: PanelDefinition, press: @escaping (PanelAction) -> Void) {
        self.panel = panel
        self.press = press
    }

    public var body: some View {
        let rows = PanelLayout.grid(PanelLayout.fitting(panel.buttons)) { $0.action.isText }
        KeypadGrid(rows: rows, columns: PanelLayout.columns) { button, width in
            if let button {
                ShortcutButtonView(button: button, width: width) { press(button.action) }
            } else {
                EmptySlotView(width: width)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(panel.title) shortcuts")
    }
}
