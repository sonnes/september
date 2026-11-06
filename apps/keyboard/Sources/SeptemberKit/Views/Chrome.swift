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
    /// only the accessibility action. A `repeats` control presses again while
    /// it is held.
    func pressable(
        label: String,
        isSelected: Bool = false,
        repeats: Bool = false,
        onPressing: @escaping (Bool) -> Void,
        action: @escaping @MainActor () -> Void
    ) -> some View {
        modifier(
            Pressable(
                label: label, isSelected: isSelected, repeats: repeats,
                onPressing: onPressing, action: action))
    }
}

private struct Pressable: ViewModifier {
    let label: String
    let isSelected: Bool
    let repeats: Bool
    let onPressing: (Bool) -> Void
    let action: @MainActor () -> Void

    @State private var tracker = PressTracker()
    @State private var size = CGSize.zero

    func body(content: Content) -> some View {
        content
            .contentShape(Rectangle())
            .onGeometryChange(for: CGSize.self) { $0.size } action: { size = $0 }
            // A drag with no minimum distance reports the pointer going down,
            // moving and coming up. A long press gesture ends its `pressing`
            // phase when its minimum duration passes, not on release.
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { drag in
                        if !tracker.down(repeats: repeats, press: action) {
                            tracker.moved(inside: contains(drag.location))
                        }
                        onPressing(tracker.isPressed)
                    }
                    .onEnded { drag in
                        tracker.up(inside: contains(drag.location), press: action)
                        onPressing(false)
                    }
            )
            .onDisappear { tracker.cancel() }
            .accessibilityElement()
            .accessibilityLabel(label)
            .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
            .accessibilityAction { action() }
    }

    private func contains(_ point: CGPoint) -> Bool {
        CGRect(origin: .zero, size: size).contains(point)
    }
}
