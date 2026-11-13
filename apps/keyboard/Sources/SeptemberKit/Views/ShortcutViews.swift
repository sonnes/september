import SwiftUI

/// A button of a keypad, Mine, Phrases, or a Write panel. A shortcut button
/// shows only its keys, and its name shows above it while the pointer or the
/// gaze rests on it. A text button shows its text, and a private text button
/// shows a lock and its name only. In a keypad, a button with a region or a
/// symbol shows that icon in place of its keys. The accessibility label is
/// always the full name.
public struct ShortcutButtonView: View {
    private let button: PanelButton
    private let width: CGFloat
    private let showsIcon: Bool
    private let press: () -> Void

    @State private var isPressed = false
    @State private var isHovered = false

    public init(
        button: PanelButton,
        width: CGFloat = Metrics.Keypad.buttonWidth,
        showsIcon: Bool = false,
        press: @escaping () -> Void
    ) {
        self.button = button
        self.width = width
        self.showsIcon = showsIcon
        self.press = press
    }

    public var body: some View {
        label
            .frame(width: width, height: Metrics.Keypad.buttonHeight)
            .background(shape.fill(Color(fill)))
            .overlay(shape.strokeBorder(Color(stroke), lineWidth: 1))
            .overlay(alignment: .top) { tip }
            .onHover { isHovered = $0 }
            .pressable(
                label: button.accessibilityLabel,
                trigger: .down(KeyHold(behavior: { [action = button.action] in action.holdBehavior }))
            ) { isPressed = $0 } action: {
                press()
            }
            .zIndex(isHovered ? 1 : 0)
    }

    @ViewBuilder
    private var label: some View {
        if showsIcon, let region = button.region {
            WindowRegionIcon(region: region)
                .accessibilityHidden(true)
        } else if showsIcon, let symbol = button.symbol {
            Image(systemName: symbol)
                .font(Typography.shortcutSymbol)
                .foregroundStyle(Color(Tokens.shortcutLabel))
                .accessibilityHidden(true)
        } else if let hint = button.action.hint {
            Text(hint)
                .font(Typography.shortcutKeys)
                .foregroundStyle(Color(Tokens.shortcutLabel))
                .lineLimit(1)
                .minimumScaleFactor(Metrics.Keypad.keysMinimumScale)
        } else if case .privateText = button.action {
            HStack(spacing: Metrics.UserPanel.lockSpacing) {
                Image(systemName: "lock.fill")
                    .font(Typography.UserPanel.lock)
                    .foregroundStyle(Color(Tokens.accent))
                text
            }
        } else {
            text
        }
    }

    private var text: some View {
        Text(button.label)
            .font(Typography.shortcutText)
            .foregroundStyle(Color(Tokens.keyText))
            .lineLimit(1)
            .truncationMode(.tail)
            .padding(.horizontal, Metrics.Keypad.textPadding)
    }

    /// The name of a shortcut button, drawn above the button. A text button
    /// shows its own text, so it needs no name.
    @ViewBuilder
    private var tip: some View {
        if isHovered, button.action.hint != nil {
            // A frame with no height at the top edge of the button holds the
            // tip at its bottom, so the tip grows up from the button.
            ShortcutTip(text: button.label)
                .fixedSize()
                .padding(.bottom, Metrics.Keypad.tipGap)
                .frame(height: 0, alignment: .bottom)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
    }

    private var shape: RoundedRectangle {
        RoundedRectangle(cornerRadius: Metrics.Keypad.cornerRadius, style: .continuous)
    }

    private var fill: ThemeColor {
        let base = button.action.isText ? Tokens.key : Tokens.keySpecial
        if isPressed { return base.pressed }
        return isHovered ? Tokens.keyActive : base
    }

    private var stroke: ThemeColor {
        if isHovered { return Tokens.accent }
        return button.action.isText ? Tokens.strokeStandard : Tokens.strokeSpecial
    }
}

/// A small screen with the part that a window takes filled in.
struct WindowRegionIcon: View {
    let region: WindowRegion

    var body: some View {
        let size = Metrics.Keypad.regionIcon
        let inset = Metrics.Keypad.regionIconInset
        let inner = CGSize(width: size.width - inset * 2, height: size.height - inset * 2)
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: Metrics.Keypad.regionIconCornerRadius, style: .continuous)
                .strokeBorder(Color(Tokens.shortcutLabel), lineWidth: Metrics.Keypad.regionIconStroke)
            RoundedRectangle(cornerRadius: Metrics.Keypad.regionCornerRadius, style: .continuous)
                .fill(Color(Tokens.shortcutLabel))
                .frame(width: inner.width * region.width, height: inner.height * region.height)
                .offset(x: inset + inner.width * region.x, y: inset + inner.height * region.y)
        }
        .frame(width: size.width, height: size.height)
    }
}

/// The name above a button: inverted colors and an arrow that points down at
/// the button.
struct ShortcutTip: View {
    let text: String

    var body: some View {
        VStack(spacing: 0) {
            Text(text)
                .font(Typography.shortcutTip)
                .foregroundStyle(Color(Tokens.background))
                .padding(.horizontal, Metrics.Keypad.tipHorizontalPadding)
                .padding(.vertical, Metrics.Keypad.tipVerticalPadding)
                .background(
                    RoundedRectangle(cornerRadius: Metrics.Keypad.tipCornerRadius, style: .continuous)
                        .fill(Color(Tokens.keyText))
                )
            TipArrow()
                .fill(Color(Tokens.keyText))
                .frame(width: Metrics.Keypad.tipArrow.width, height: Metrics.Keypad.tipArrow.height)
        }
        .shadow(
            color: Color(Tokens.tipShadow), radius: Metrics.Keypad.tipShadowRadius,
            y: Metrics.Keypad.tipShadowY)
    }
}

/// A triangle that points down.
private struct TipArrow: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: rect.minX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
            path.closeSubpath()
        }
    }
}

/// An empty slot of the grid of Mine or a Write panel, drawn with a dashed
/// border.
struct EmptySlotView: View {
    let width: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: Metrics.Keypad.cornerRadius, style: .continuous)
            .strokeBorder(Color(Tokens.strokeStandard), style: StrokeStyle(lineWidth: 1, dash: [Metrics.Keypad.emptySlotDash]))
            .frame(width: width, height: Metrics.Keypad.buttonHeight)
            .accessibilityHidden(true)
    }
}
