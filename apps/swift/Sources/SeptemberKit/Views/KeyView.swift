import SwiftUI

/// A single key. One view covers all four kinds from the component library —
/// they differ only in fill, label treatment and size.
public struct KeyView: View {
    private let key: KeyDefinition
    private let tint: RGBA
    private let isActive: Bool
    private let width: CGFloat?
    private let press: () -> Void

    @State private var isPressed = false
    @State private var repeatTimer: Timer?

    public init(
        key: KeyDefinition,
        tint: RGBA = Tokens.keyText,
        isActive: Bool = false,
        width: CGFloat? = nil,
        press: @escaping () -> Void
    ) {
        self.key = key
        self.tint = tint
        self.isActive = isActive
        self.width = width
        self.press = press
    }

    public var body: some View {
        label
            .frame(
                width: width ?? Metrics.size(for: key.kind).width,
                height: Metrics.size(for: key.kind).height
            )
            .background(
                RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                    .fill(Color(fill))
            )
            .overlay(
                RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                    .strokeBorder(Color(stroke), lineWidth: 1)
            )
            .shadow(color: Color(Tokens.keyShadow), radius: 1, y: 1)
            .shadow(color: Color(Tokens.keyGlow), radius: 8)
            .contentShape(Rectangle())
            .onTapGesture { press() }
            .onLongPressGesture(minimumDuration: 0.4, pressing: { pressing in
                isPressed = pressing
                pressing ? startRepeating() : stopRepeating()
            }, perform: {})
            .accessibilityElement()
            .accessibilityLabel(key.accessibilityLabel)
            .accessibilityAddTraits(isActive ? [.isButton, .isSelected] : .isButton)
            .accessibilityAction { press() }
            .animation(.easeOut(duration: 0.08), value: isPressed)
            .animation(.easeOut(duration: 0.12), value: isActive)
    }

    @ViewBuilder
    private var label: some View {
        switch key.kind {
        case .dual:
            VStack(spacing: Metrics.dualLabelGap) {
                Text(key.secondaryLabel ?? "")
                    .font(.system(size: Metrics.dualSecondaryLabelSize))
                    .foregroundStyle(Color(Tokens.dualSecondary))
                Text(key.label)
                    .font(.system(size: Metrics.labelSize(for: .dual)))
                    .foregroundStyle(Color(tint))
            }
        case .standard:
            Text(key.label)
                .font(.system(size: Metrics.labelSize(for: .standard)))
                .foregroundStyle(Color(tint))
        case .special:
            Text(key.label)
                .font(.system(size: Metrics.labelSize(for: .special)))
                .foregroundStyle(Color(isActive ? Tokens.accent : tint))
        case .function:
            Text(key.label)
                .font(.system(size: Metrics.labelSize(for: .function), weight: .medium))
                .foregroundStyle(Color(tint))
        }
    }

    private var fill: RGBA {
        if isActive { return Tokens.accent.opacity(0.18) }
        if isPressed { return Tokens.key.lightened(by: 0.08) }
        return key.kind == .standard || key.kind == .dual ? Tokens.key : Tokens.keySpecial
    }

    private var stroke: RGBA {
        if isActive { return Tokens.accent }
        return key.kind == .standard || key.kind == .dual
            ? Tokens.strokeStandard : Tokens.strokeSpecial
    }

    /// Holding delete or an arrow key repeats, as a hardware keyboard does.
    private func startRepeating() {
        guard case .virtual(let virtual) = key.action, virtual.repeatsWhenHeld else { return }
        repeatTimer?.invalidate()
        repeatTimer = Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { _ in
            Task { @MainActor in press() }
        }
    }

    private func stopRepeating() {
        repeatTimer?.invalidate()
        repeatTimer = nil
    }
}

extension RGBA {
    func opacity(_ value: Double) -> RGBA {
        RGBA(red: red, green: green, blue: blue, alpha: value)
    }

    func lightened(by amount: Double) -> RGBA {
        RGBA(
            red: min(red + amount, 1),
            green: min(green + amount, 1),
            blue: min(blue + amount, 1),
            alpha: alpha
        )
    }
}

extension VirtualKey {
    /// Keys where holding should repeat.
    public var repeatsWhenHeld: Bool {
        switch self {
        case .delete, .forwardDelete, .left, .right, .up, .down, .space: true
        default: false
        }
    }
}
