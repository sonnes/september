import SwiftUI

/// A single key. One view covers all four kinds from the component library —
/// they differ only in fill, label treatment and size.
public struct KeyView: View {
    private let key: KeyDefinition
    private let tint: ThemeColor
    private let face: KeyFace
    private let width: CGFloat?
    private let hold: KeyHold
    private let press: () -> Void

    @State private var isPressed = false

    public init(
        key: KeyDefinition,
        tint: ThemeColor = Tokens.keyText,
        face: KeyFace,
        width: CGFloat? = nil,
        hold: KeyHold = .once,
        press: @escaping () -> Void
    ) {
        self.key = key
        self.tint = tint
        self.face = face
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
            .keyChrome(fill: fill, stroke: stroke)
            .pressable(label: face.accessibilityLabel, isSelected: isActive, trigger: .down(hold)) {
                isPressed = $0
            } action: {
                press()
            }
            .animation(.easeOut(duration: Metrics.pressAnimation), value: isPressed)
            .animation(.easeOut(duration: Metrics.activeAnimation), value: isActive)
    }

    private var isActive: Bool { face.look != .off }

    private var label: some View {
        VStack(spacing: Metrics.dualLabelGap) {
            glyphs
            if face.look == .locked {
                Capsule()
                    .fill(Color(Tokens.accent))
                    .frame(width: Metrics.lockBarSize.width, height: Metrics.lockBarSize.height)
            }
        }
    }

    @ViewBuilder
    private var glyphs: some View {
        switch key.kind {
        case .dual:
            // The label that shift types is in the tint, and the other is dim.
            VStack(spacing: Metrics.dualLabelGap) {
                Text(key.secondaryLabel ?? "")
                    .font(Typography.keySecondaryLabel)
                    .foregroundStyle(Color(face.isShifted ? tint : Tokens.dualSecondary))
                Text(key.label)
                    .font(Typography.keyLabel(.dual))
                    .foregroundStyle(Color(face.isShifted ? Tokens.dualSecondary : tint))
            }
        case .standard:
            glyph(font: Typography.keyLabel(.standard))
                .foregroundStyle(Color(tint))
        case .special:
            // A one-character label is a symbol, such as ⌘ or ⇧.
            glyph(font: key.label.count == 1 ? Typography.keySymbol : Typography.keyLabel(.special))
                .foregroundStyle(Color(isActive ? Tokens.accent : tint))
        case .function:
            glyph(font: Typography.keyLabel(.function))
                .foregroundStyle(Color(tint))
        }
    }

    @ViewBuilder
    private func glyph(font: Font) -> some View {
        switch face.glyph {
        case .text(let text): Text(text).font(font)
        case .symbol(let name): Image(systemName: name).font(font)
        }
    }

    private var fill: ThemeColor {
        if face.look == .locked { return Tokens.keyLocked }
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
