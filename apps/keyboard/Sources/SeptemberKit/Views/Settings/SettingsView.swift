import SwiftUI

/// The Settings window: a sidebar with the groups Speak, Type, and Keyboard,
/// and the selected page at the right. The window uses the standard macOS
/// controls, not the keyboard tokens.
public struct SettingsView: View {
    private let pages: SettingsPages
    @State private var selection: SettingsPage? = .voice

    public init(pages: SettingsPages, selection: SettingsPage = .voice) {
        self.pages = pages
        _selection = State(initialValue: selection)
    }

    public var body: some View {
        NavigationSplitView {
            List(selection: $selection) {
                ForEach(SettingsGroup.allCases) { group in
                    Section(group.title) {
                        ForEach(group.pages) { page in
                            SettingsSidebarRow(page: page).tag(page)
                        }
                    }
                }
            }
            .navigationSplitViewColumnWidth(Metrics.Settings.sidebarWidth)
        } detail: {
            let page = selection ?? .voice
            pages[page]
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .navigationTitle(page.title)
        }
        .frame(
            minWidth: Metrics.Settings.windowSize.width,
            minHeight: Metrics.Settings.windowSize.height)
    }
}

/// A sidebar row: the colored icon and the title of the page.
private struct SettingsSidebarRow: View {
    let page: SettingsPage

    var body: some View {
        Label {
            Text(page.title)
        } icon: {
            Image(systemName: page.symbol)
                .font(Typography.settingsIcon)
                .foregroundStyle(Color(Tokens.onAccent))
                .frame(width: Metrics.Settings.iconSize, height: Metrics.Settings.iconSize)
                .background(
                    RoundedRectangle(
                        cornerRadius: Metrics.Settings.iconCornerRadius, style: .continuous
                    )
                    .fill(Color(page.iconFill))
                )
                .accessibilityHidden(true)
        }
    }
}
