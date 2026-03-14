import SwiftUI

/// 200pt wide right panel — navigation shortcuts + arrow key cluster.
struct RightKeypadView: View {
    let accessibilityManager: AccessibilityManager

    private let columns = [
        GridItem(.flexible(), spacing: 4),
        GridItem(.flexible(), spacing: 4),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(ShortcutLayout.rightKeypad.title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(DesignColors.shortcutIcon)
                .textCase(.uppercase)
                .padding(.horizontal, 4)

            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(ShortcutLayout.rightKeypad.shortcuts) { shortcut in
                    ShortcutButton(shortcut: shortcut) {
                        guard accessibilityManager.isGranted else { return }
                        EventInjector.shared.send(
                            keyCode: shortcut.keyCode,
                            modifiers: shortcut.modifiers
                        )
                    }
                }
            }

            Divider()
                .padding(.vertical, 4)

            // Arrow key cluster
            arrowKeys
        }
        .frame(width: 200)
        .padding(8)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Navigation shortcuts")
    }

    private var arrowKeys: some View {
        VStack(spacing: 2) {
            HStack(spacing: 2) {
                Spacer()
                arrowKey("↑", code: KeyCodes.upArrow)
                Spacer()
            }
            HStack(spacing: 2) {
                arrowKey("←", code: KeyCodes.leftArrow)
                arrowKey("↓", code: KeyCodes.downArrow)
                arrowKey("→", code: KeyCodes.rightArrow)
            }
        }
    }

    private func arrowKey(_ label: String, code: UInt16) -> some View {
        Button {
            guard accessibilityManager.isGranted else { return }
            EventInjector.shared.send(keyCode: code)
        } label: {
            Text(label)
                .font(.system(size: 14))
                .foregroundStyle(DesignColors.keyStandardLabel)
                .frame(width: 40, height: 32)
                .background(
                    RoundedRectangle(cornerRadius: 4)
                        .fill(DesignColors.keyStandardFill)
                )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(label) arrow")
    }
}
