import SwiftUI

/// 120×40pt edit shortcut button with SF Symbol icon + label.
struct ShortcutButton: View {
    let shortcut: ShortcutDefinition
    let onPress: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: onPress) {
            HStack(spacing: 6) {
                Image(systemName: shortcut.icon)
                    .font(.system(size: 14))
                    .foregroundStyle(DesignColors.shortcutIcon)
                    .frame(width: 14, height: 14)

                Text(shortcut.label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(DesignColors.shortcutLabel)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .frame(height: 40)
            .background(
                RoundedRectangle(cornerRadius: 5)
                    .fill(isHovered ? Color.gray.opacity(0.25) : Color.gray.opacity(0.15))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 5)
                    .strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .help(shortcut.tooltip)
        .dwell(cornerRadius: 5, isHovered: $isHovered, action: onPress)
        .accessibilityLabel(shortcut.tooltip)
    }
}
