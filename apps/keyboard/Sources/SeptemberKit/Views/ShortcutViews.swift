import SwiftUI

/// A panel button. A shortcut button shows only its keys, and its name shows
/// above it while the pointer or the gaze rests on it. A text button shows its
/// text. The accessibility label is always the full name.
public struct ShortcutButtonView: View {
    private let button: PanelButton
    private let width: CGFloat
    private let press: () -> Void

    @State private var isPressed = false
    @State private var isHovered = false

    public init(
        button: PanelButton,
        width: CGFloat = Metrics.AppPanel.buttonWidth,
        press: @escaping () -> Void
    ) {
        self.button = button
        self.width = width
        self.press = press
    }

    public var body: some View {
        label
            .frame(width: width, height: Metrics.AppPanel.buttonHeight)
            .background(shape.fill(Color(fill)))
            .overlay(shape.strokeBorder(Color(stroke), lineWidth: 1))
            .overlay(alignment: .topTrailing) { learnedDot }
            .overlay(alignment: .top) { tip }
            .onHover { isHovered = $0 }
            .pressable(label: button.accessibilityLabel) { isPressed = $0 } action: { press() }
            .zIndex(isHovered ? 1 : 0)
    }

    @ViewBuilder
    private var label: some View {
        if let hint = button.hint {
            Text(hint)
                .font(Typography.shortcutKeys)
                .foregroundStyle(Color(Tokens.shortcutLabel))
                .lineLimit(1)
                .minimumScaleFactor(Metrics.AppPanel.keysMinimumScale)
        } else {
            Text(button.label)
                .font(Typography.shortcutText)
                .foregroundStyle(Color(Tokens.keyText))
                .lineLimit(1)
                .truncationMode(.tail)
                .padding(.horizontal, Metrics.AppPanel.textPadding)
        }
    }

    @ViewBuilder
    private var learnedDot: some View {
        if button.isLearned {
            Circle()
                .fill(Color(Tokens.accent))
                .frame(width: Metrics.AppPanel.learnedDot, height: Metrics.AppPanel.learnedDot)
                .padding(.top, Metrics.AppPanel.learnedDotTop)
                .padding(.trailing, Metrics.AppPanel.learnedDotTrailing)
                .accessibilityHidden(true)
        }
    }

    /// The name of a shortcut button, drawn above the button. A text button
    /// shows its own text, so it needs no name.
    @ViewBuilder
    private var tip: some View {
        if isHovered, button.hint != nil {
            ShortcutTip(text: button.label)
                .fixedSize()
                .alignmentGuide(.top) { $0[.bottom] + Metrics.AppPanel.tipGap }
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
    }

    private var shape: RoundedRectangle {
        RoundedRectangle(cornerRadius: Metrics.AppPanel.cornerRadius, style: .continuous)
    }

    private var fill: ThemeColor {
        let base = button.isText ? Tokens.key : Tokens.keySpecial
        if isPressed { return base.pressed }
        return isHovered ? Tokens.keyActive : base
    }

    private var stroke: ThemeColor {
        if isHovered { return Tokens.accent }
        return button.isText ? Tokens.strokeStandard : Tokens.strokeSpecial
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
                .padding(.horizontal, Metrics.AppPanel.tipHorizontalPadding)
                .padding(.vertical, Metrics.AppPanel.tipVerticalPadding)
                .background(
                    RoundedRectangle(cornerRadius: Metrics.AppPanel.tipCornerRadius, style: .continuous)
                        .fill(Color(Tokens.keyText))
                )
            TipArrow()
                .fill(Color(Tokens.keyText))
                .frame(width: Metrics.AppPanel.tipArrow.width, height: Metrics.AppPanel.tipArrow.height)
        }
        .shadow(
            color: Color(Tokens.tipShadow), radius: Metrics.AppPanel.tipShadowRadius,
            y: Metrics.AppPanel.tipShadowY)
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

/// An empty slot of the app panel grid, drawn with a dashed border.
struct EmptySlotView: View {
    let width: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: Metrics.AppPanel.cornerRadius, style: .continuous)
            .strokeBorder(Color(Tokens.strokeStandard), style: StrokeStyle(lineWidth: 1, dash: [Metrics.AppPanel.emptySlotDash]))
            .frame(width: width, height: Metrics.AppPanel.buttonHeight)
            .accessibilityHidden(true)
    }
}
