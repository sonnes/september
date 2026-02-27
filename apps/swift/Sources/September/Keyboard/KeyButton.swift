import SwiftUI

struct KeyButton: View {
    let key: KeyDefinition
    let isShiftActive: Bool
    let onPress: () -> Void

    @State private var isHovered = false
    @State private var isPressed = false

    var body: some View {
        Button(action: onPress) {
            keyLabel
                .frame(width: key.width.rawValue, height: 40)
                .background(backgroundColor)
                .cornerRadius(6)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 0.5)
                )
                .shadow(color: .black.opacity(0.1), radius: 1, x: 0, y: 1)
        }
        .buttonStyle(.plain)
        .dwell(cornerRadius: 6, isHovered: $isHovered, action: onPress)
    }

    @ViewBuilder
    private var keyLabel: some View {
        if key.isDualLabel {
            VStack(spacing: 1) {
                Text(key.shiftLabel ?? "")
                    .font(.system(size: 10))
                    .foregroundStyle(isShiftActive ? .primary : .secondary)
                Text(key.label)
                    .font(.system(size: 14))
                    .foregroundStyle(isShiftActive ? .secondary : .primary)
            }
        } else {
            Text(key.label)
                .font(.system(size: key.isModifier ? 14 : 16))
                .foregroundStyle(.primary)
        }
    }

    private var backgroundColor: Color {
        if isPressed {
            return Color.gray.opacity(0.4)
        } else if isHovered {
            return Color.gray.opacity(0.25)
        } else if key.isModifier {
            return Color.gray.opacity(0.2)
        } else {
            return Color.white.opacity(0.9)
        }
    }
}
