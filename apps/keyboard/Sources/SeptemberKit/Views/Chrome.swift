import SwiftUI

extension View {
    /// The rounded surface of a key or shortcut button.
    func keyChrome(
        fill: ThemeColor,
        stroke: ThemeColor = Tokens.strokeStandard
    ) -> some View {
        background(
            RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                .fill(Color(fill))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                .strokeBorder(Color(stroke), lineWidth: 1)
        )
        .shadow(color: Color(Tokens.keyShadow), radius: 1, y: 1)
        .shadow(color: Color(Tokens.keyGlow), radius: 8)
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
    /// only the accessibility action, and acts at once.
    ///
    /// - Parameter trigger: `.up` acts when the button goes up, so a slide
    ///   off the control cancels. `.down` acts when the button goes down,
    ///   through the `KeyPresser` of the environment.
    func pressable(
        label: String,
        isSelected: Bool = false,
        trigger: PressTrigger = .up,
        onPressing: @escaping (Bool) -> Void,
        action: @escaping () -> Void
    ) -> some View {
        modifier(
            Pressable(
                label: label, isSelected: isSelected, trigger: trigger, onPressing: onPressing,
                action: action))
    }
}

/// When a control acts.
public enum PressTrigger {
    /// When the button goes up. A slide off the control cancels the press.
    case up
    /// When the button goes down. `KeyHold` tells what a held press does.
    case down(KeyHold)
}

/// What a control that acts on the down does while the user holds it.
public struct KeyHold {
    let behavior: @MainActor () -> HoldBehavior
    let again: (@MainActor () -> Void)?
    let choices: (@MainActor ([String]) -> Void)?

    /// - Parameters:
    ///   - behavior: read when the button goes down.
    ///   - again: each repeat. Without it, a repeat does the action again.
    ///   - choices: shows the accents of a held letter.
    public init(
        behavior: @escaping @MainActor () -> HoldBehavior = { .once },
        again: (@MainActor () -> Void)? = nil,
        choices: (@MainActor ([String]) -> Void)? = nil
    ) {
        self.behavior = behavior
        self.again = again
        self.choices = choices
    }

    /// Acts one time, however long the user holds the control.
    public static var once: KeyHold { KeyHold() }
}

extension EnvironmentValues {
    /// Times the controls that act on the down. Without one, such a control
    /// acts at once and does not repeat.
    @Entry public var keyPresser: KeyPresser?
}

private struct Pressable: ViewModifier {
    let label: String
    let isSelected: Bool
    let trigger: PressTrigger
    let onPressing: (Bool) -> Void
    let action: () -> Void

    @Environment(\.keyPresser) private var presser
    /// True while the gesture runs. A cancelled gesture resets it too, with
    /// no call to `onEnded`.
    @GestureState private var isTracking = false
    @State private var isDown = false
    @State private var press: Int?
    /// The press of a control that acts when the button goes up.
    @State private var tap = PressTracker()
    @State private var size = CGSize.zero

    func body(content: Content) -> some View {
        gestures(content.contentShape(Rectangle()))
            .accessibilityElement()
            .accessibilityLabel(label)
            .accessibilityAddTraits(isSelected ? [.isButton, .isSelected] : .isButton)
            .accessibilityAction { action() }
    }

    @ViewBuilder
    private func gestures(_ content: some View) -> some View {
        switch trigger {
        case .up:
            content
                .onGeometryChange(for: CGSize.self) { $0.size } action: { size = $0 }
                // A drag with no minimum distance reports the pointer going
                // down, moving, and coming up. The control acts only when the
                // pointer comes up inside it.
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { drag in
                            if !tap.down() { tap.moved(inside: contains(drag.location)) }
                            onPressing(tap.isPressed)
                        }
                        .onEnded { drag in
                            tap.up(inside: contains(drag.location)) { action() }
                            onPressing(false)
                        }
                )
                .onDisappear { tap.cancel() }
        case .down(let hold):
            content
                // The gesture calls begin and end at once. A very short click
                // can end the gesture with no call to `onChanged`, so the end
                // begins the press first.
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .updating($isTracking) { _, tracking, _ in tracking = true }
                        .onChanged { _ in if !isDown { begin(hold) } }
                        .onEnded { _ in
                            if !isDown { begin(hold) }
                            end()
                        }
                )
                .onChange(of: isTracking) { _, tracking in if !tracking { end() } }
                .onDisappear(perform: end)
        }
    }

    private func contains(_ point: CGPoint) -> Bool {
        CGRect(origin: .zero, size: size).contains(point)
    }

    private func begin(_ hold: KeyHold) {
        isDown = true
        onPressing(true)
        guard let presser else { return action() }
        let action = action
        press = presser.down(
            hold.behavior(), act: { action() }, again: hold.again ?? { action() },
            choices: hold.choices ?? { _ in })
    }

    private func end() {
        guard isDown else { return }
        isDown = false
        if let press { presser?.up(press) }
        press = nil
        onPressing(false)
    }
}
