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

/// A keypad: the Edit, Text, and System keypads. Each button takes one cell
/// of the grid.
public struct PanelGridView: View {
    private let panel: PanelDefinition
    private let width: CGFloat
    private let press: (PanelAction) -> Void

    public init(
        panel: PanelDefinition,
        width: CGFloat = Metrics.AppPanel.width,
        press: @escaping (PanelAction) -> Void
    ) {
        self.panel = panel
        self.width = width
        self.press = press
    }

    public var body: some View {
        let spacing = Metrics.AppPanel.gap
        let columns = max(panel.columns, 1)
        let buttonWidth = (width - spacing * CGFloat(columns - 1)) / CGFloat(columns)

        VStack(alignment: .leading, spacing: Metrics.Panel.titleSpacing) {
            SectionLabel(text: panel.title)
            LazyVGrid(
                columns: Array(
                    repeating: GridItem(.fixed(buttonWidth), spacing: spacing),
                    count: columns
                ),
                spacing: spacing
            ) {
                ForEach(panel.buttons) { button in
                    ShortcutButtonView(button: button, width: buttonWidth) {
                        press(button.action)
                    }
                }
            }
        }
        .frame(width: width)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(panel.title) shortcuts")
    }
}

/// Shortcuts for the app in front, headed by the app name, or by the panel
/// title when the app has no name.
///
/// The grid has two columns and six rows. A text button takes a whole row.
/// Empty slots keep the height of the panel the same in each app.
public struct AppShortcutsView: View {
    private let panel: PanelDefinition
    private let appName: String?
    private let width: CGFloat
    private let press: (PanelAction) -> Void

    public init(
        panel: PanelDefinition,
        appName: String?,
        width: CGFloat = Metrics.AppPanel.width,
        press: @escaping (PanelAction) -> Void
    ) {
        self.panel = panel
        self.appName = appName
        self.width = width
        self.press = press
    }

    public var body: some View {
        let gap = Metrics.AppPanel.gap
        let cell = (width - gap) / CGFloat(AppPanelLayout.columns)
        let rows = AppPanelLayout.rows(AppPanelLayout.fitting(panel.buttons))

        VStack(alignment: .leading, spacing: gap) {
            header
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
            ForEach(rows.count..<max(Metrics.AppPanel.rows, rows.count), id: \.self) { _ in
                HStack(spacing: gap) {
                    EmptySlotView(width: cell)
                    EmptySlotView(width: cell)
                }
            }
        }
        .frame(width: width, alignment: .leading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(title) shortcuts")
    }

    private var header: some View {
        HStack(spacing: Metrics.AppPanel.headerSpacing) {
            Image(systemName: "app.dashed")
                .font(Typography.appIcon)
                .foregroundStyle(Color(Tokens.accent))
            Text(title)
                .font(Typography.appName)
                .foregroundStyle(Color(Tokens.keyText))
                .lineLimit(1)
            Circle()
                .fill(Color(Tokens.positive))
                .frame(width: Metrics.AppPanel.appDot, height: Metrics.AppPanel.appDot)
        }
        .padding(.bottom, Metrics.AppPanel.headerBottom - Metrics.AppPanel.gap)
    }

    private var title: String { appName ?? panel.title }
}
