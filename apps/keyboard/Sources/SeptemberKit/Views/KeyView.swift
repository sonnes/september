import SwiftUI

/// A single key. One view covers all four kinds from the component library —
/// they differ only in fill, label treatment and size.
public struct KeyView: View {
    private let key: KeyDefinition
    private let tint: ThemeColor
    private let isActive: Bool
    private let width: CGFloat?
    private let hold: KeyHold
    private let press: () -> Void

    @State private var isPressed = false

    public init(
        key: KeyDefinition,
        tint: ThemeColor = Tokens.keyText,
        isActive: Bool = false,
        width: CGFloat? = nil,
        hold: KeyHold = .once,
        press: @escaping () -> Void
    ) {
        self.key = key
        self.tint = tint
        self.isActive = isActive
        self.width = width
        self.hold = hold
        self.press = press
    }

    public var body: some View {
        label
            .frame(
                width: width ?? Metrics.size(for: key.kind).width,
                height: Metrics.size(for: key.kind).height
            )
            .keyChrome(fill: fill, stroke: stroke, glow: true)
            .pressable(label: key.accessibilityLabel, isSelected: isActive, trigger: .down(hold)) {
                isPressed = $0
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
            // A one-character label is a symbol, such as ⌘ or ⇧.
            Text(key.label)
                .font(key.label.count == 1 ? Typography.keySymbol : Typography.keyLabel(.special))
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
}
