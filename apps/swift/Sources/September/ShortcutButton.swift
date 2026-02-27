import SwiftUI

struct ShortcutButton: View {
    let shortcut: ShortcutDefinition
    let onPress: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: onPress) {
            Text(shortcut.label)
                .font(.system(size: shortcut.label.count > 3 ? 9 : 12))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(width: 36, height: 28)
                .background(backgroundColor)
                .cornerRadius(5)
                .overlay(
                    RoundedRectangle(cornerRadius: 5)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 0.5)
                )
                .shadow(color: .black.opacity(0.08), radius: 1, x: 0, y: 1)
        }
        .buttonStyle(.plain)
        .dwell(cornerRadius: 5, isHovered: $isHovered, action: onPress)
        .help(shortcut.tooltip)
    }

    private var backgroundColor: Color {
        isHovered
            ? Color.gray.opacity(0.25)
            : Color.gray.opacity(0.15)
    }
}
