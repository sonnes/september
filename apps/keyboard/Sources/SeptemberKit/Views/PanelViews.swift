import SwiftUI

/// Section heading used above each group of shortcuts.
struct SectionLabel: View {
    let text: String

    var body: some View {
        Text(text)
            .font(Typography.sectionLabel)
            .tracking(Typography.sectionTracking)
            .foregroundStyle(Color(Tokens.sectionLabel))
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }
}

/// A grid of compact shortcut buttons — the EDIT, NAVIGATE and SYSTEM keypads.
public struct PanelGridView: View {
    private let panel: PanelDefinition
    private let width: CGFloat
    private let press: (PanelAction) -> Void

    public init(
        panel: PanelDefinition,
        width: CGFloat = Metrics.keypadWidth,
        press: @escaping (PanelAction) -> Void
    ) {
        self.panel = panel
        self.width = width
        self.press = press
    }

    public var body: some View {
        let spacing = Metrics.rowSpacing * 2
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

/// Shortcuts for whichever app is in front, headed by that app's name.
public struct AppShortcutsView: View {
    private let panel: PanelDefinition
    private let appName: String
    private let width: CGFloat
    private let press: (PanelAction) -> Void

    public init(
        panel: PanelDefinition,
        appName: String,
        width: CGFloat = Metrics.keypadWidth,
        press: @escaping (PanelAction) -> Void
    ) {
        self.panel = panel
        self.appName = appName
        self.width = width
        self.press = press
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Metrics.Panel.appSpacing) {
            HStack(spacing: Metrics.Panel.appSpacing) {
                Image(systemName: "app.dashed")
                    .font(Typography.appIcon)
                    .foregroundStyle(Color(Tokens.accent))
                Text(appName)
                    .font(Typography.appName)
                    .foregroundStyle(Color(Tokens.keyText))
                    .lineLimit(1)
                Circle()
                    .fill(Color(Tokens.positive))
                    .frame(width: Metrics.Panel.appDot, height: Metrics.Panel.appDot)
            }
            .padding(.bottom, Metrics.Panel.appHeaderBottom)

            ForEach(panel.buttons) { button in
                ShortcutFullView(button: button, width: width) { press(button.action) }
            }
        }
        .frame(width: width, alignment: .leading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(appName) shortcuts")
    }
}
