import SwiftUI

extension View {
    /// The rounded surface of a key or shortcut button.
    func keyChrome(
        fill: ThemeColor,
        stroke: ThemeColor = Tokens.strokeStandard,
        shadow: Bool = true,
        glow: Bool = false
    ) -> some View {
        background(
            RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                .fill(Color(fill))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                .strokeBorder(Color(stroke), lineWidth: 1)
        )
        .shadow(color: shadow ? Color(Tokens.keyShadow) : .clear, radius: 1, y: 1)
        .shadow(color: glow ? Color(Tokens.keyGlow) : .clear, radius: 8)
    }

    /// The surface that holds a group of keys or the tree viewer.
    func panelSurface(cornerRadius: CGFloat = Metrics.surfaceCornerRadius) -> some View {
        background(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(Color(Tokens.panelBackground))
        )
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(Color(Tokens.panelStroke), lineWidth: 1)
        )
    }

    /// A control that a tap, Dwell, Switch Control and Voice Control all press
    /// the same way. The assistive tools press through `AXPress`, which reaches
    /// only the accessibility action.
    func pressable(
        label: String,
        isSelected: Bool = false,
        onPressing: @escaping (Bool) -> Void,
        action: @escaping () -> Void
    ) -> some View {
        contentShape(Rectangle())
            .onTapGesture(perform: action)
            .onLongPressGesture(
                minimumDuration: Metrics.holdDuration, pressing: onPressing, perform: {})
            .accessibilityElement()
            .accessibilityLabel(label)
            .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
            .accessibilityAction { action() }
    }
}
