import SwiftUI

/// 160×36pt app shortcut button with icon + label + keyboard hint.
struct ShortcutFullButton: View {
    let shortcut: ShortcutDefinition
    let onPress: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: onPress) {
            HStack(spacing: 6) {
                Image(systemName: shortcut.icon)
                    .font(.system(size: 16))
                    .foregroundStyle(DesignColors.shortcutIcon)
                    .frame(width: 16, height: 16)

                Text(shortcut.label)
                    .font(.system(size: 10))
                    .foregroundStyle(DesignColors.shortcutLabel)
                    .lineLimit(1)

                Spacer()

                if let hint = shortcut.keyboardHint {
                    Text(hint)
                        .font(.system(size: 10))
                        .foregroundStyle(DesignColors.shortcutIcon)
                }
            }
            .padding(.horizontal, 8)
            .frame(maxWidth: .infinity)
            .frame(height: 36)
            .background(
                RoundedRectangle(cornerRadius: 5)
                    .fill(isHovered ? Color.gray.opacity(0.25) : Color.gray.opacity(0.1))
            )
        }
        .buttonStyle(.plain)
        .help(shortcut.tooltip)
        .dwell(cornerRadius: 5, isHovered: $isHovered, action: onPress)
        .accessibilityLabel(shortcut.tooltip)
    }
}
