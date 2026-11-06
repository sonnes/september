import SwiftUI

/// A single key. One view covers all four kinds from the component library —
/// they differ only in fill, label treatment and size.
public struct KeyView: View {
    private let key: KeyDefinition
    private let tint: ThemeColor
    private let isActive: Bool
    private let width: CGFloat?
    private let press: () -> Void

    @State private var isPressed = false
    @State private var repeatTimer: Timer?

    public init(
        key: KeyDefinition,
        tint: ThemeColor = Tokens.keyText,
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
            .keyChrome(fill: fill, stroke: stroke, glow: true)
            .pressable(label: key.accessibilityLabel, isSelected: isActive) { pressing in
                isPressed = pressing
                pressing ? startRepeating() : stopRepeating()
            } action: {
                press()
            }
            .animation(.easeOut(duration: Metrics.pressAnimation), value: isPressed)
            .animation(.easeOut(duration: Metrics.activeAnimation), value: isActive)
    }

    @ViewBuilder
    private var label: some View {
        switch key.kind {
        case .dual:
            VStack(spacing: Metrics.dualLabelGap) {
                Text(key.secondaryLabel ?? "")
                    .font(Typography.keySecondaryLabel)
                    .foregroundStyle(Color(Tokens.dualSecondary))
                Text(key.label)
                    .font(Typography.keyLabel(.dual))
                    .foregroundStyle(Color(tint))
            }
        case .standard:
            Text(key.label)
                .font(Typography.keyLabel(.standard))
                .foregroundStyle(Color(tint))
        case .special:
            Text(key.label)
                .font(Typography.keyLabel(.special))
                .foregroundStyle(Color(isActive ? Tokens.accent : tint))
        case .function:
            Text(key.label)
                .font(Typography.keyLabel(.function))
                .foregroundStyle(Color(tint))
        }
    }

    private var fill: ThemeColor {
        if isActive { return Tokens.keyActive }
        if isPressed { return Tokens.key.pressed }
        return key.kind == .standard || key.kind == .dual ? Tokens.key : Tokens.keySpecial
    }

    private var stroke: ThemeColor {
        if isActive { return Tokens.accent }
        return key.kind == .standard || key.kind == .dual
            ? Tokens.strokeStandard : Tokens.strokeSpecial
    }

    private func startRepeating() {
        guard case .virtual(let virtual) = key.action, virtual.repeatsWhenHeld else { return }
        repeatTimer?.invalidate()
        repeatTimer = Timer.scheduledTimer(withTimeInterval: Metrics.keyRepeatInterval, repeats: true) { _ in
            Task { @MainActor in press() }
        }
    }

    private func stopRepeating() {
        repeatTimer?.invalidate()
        repeatTimer = nil
    }
}
