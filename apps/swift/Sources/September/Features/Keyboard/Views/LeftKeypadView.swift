import SwiftUI

/// 200pt wide left panel — 2-column grid of 12 edit shortcuts.
struct LeftKeypadView: View {
    let accessibilityManager: AccessibilityManager

    private let columns = [
        GridItem(.flexible(), spacing: 4),
        GridItem(.flexible(), spacing: 4),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(ShortcutLayout.leftKeypad.title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(DesignColors.shortcutIcon)
                .textCase(.uppercase)
                .padding(.horizontal, 4)

            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(ShortcutLayout.leftKeypad.shortcuts) { shortcut in
                    ShortcutButton(shortcut: shortcut) {
                        guard accessibilityManager.isGranted else { return }
                        EventInjector.shared.send(
                            keyCode: shortcut.keyCode,
                            modifiers: shortcut.modifiers
                        )
                    }
                }
            }
        }
        .frame(width: 200)
        .padding(8)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Edit shortcuts")
    }
}
