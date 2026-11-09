import SwiftUI

/// The shortcuts of the app in front, in the place of the input bar. Each
/// button is a panel button: it shows only its keys, its name shows above it
/// on hover, and its accessibility label holds the name and the keys. The
/// best shortcut is at the left. The row shows the first
/// `Metrics.Input.shortcutCount` shortcuts.
public struct ShortcutBar: View {
    private let shortcuts: [AppShortcut]
    private let onPress: (AppShortcut) -> Void

    public init(shortcuts: [AppShortcut], onPress: @escaping (AppShortcut) -> Void) {
        self.shortcuts = shortcuts
        self.onPress = onPress
    }

    public var body: some View {
        HStack(spacing: Metrics.AppPanel.gap) {
            ForEach(shortcuts.prefix(Metrics.Input.shortcutCount)) { shortcut in
                ShortcutButtonView(
                    button: PanelButton(
                        id: shortcut.shortcut.display, label: shortcut.name, symbol: nil,
                        action: .shortcut(shortcut.shortcut))
                ) {
                    onPress(shortcut)
                }
            }
        }
        .frame(width: Metrics.keyboardWidth, height: Metrics.Input.height, alignment: .leading)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Shortcuts")
    }
}
