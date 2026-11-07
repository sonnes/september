import SwiftUI

extension VerticalAlignment {
    private enum BarCenter: AlignmentID {
        static func defaultValue(in context: ViewDimensions) -> CGFloat {
            context[VerticalAlignment.center]
        }
    }

    /// The line through the centre of the input bar. The row of the bar and
    /// each group of round buttons align on it.
    static let barCenter = VerticalAlignment(BarCenter.self)
}

/// A round button with a label under it, in the row of the input bar. The
/// mode buttons and the clipboard buttons use it.
///
/// The centre of the circle is the vertical centre of the button, so the
/// circles line up with the input bar and Speak.
struct ModeButton: View {
    let title: String
    let symbol: String
    let isOn: Bool
    let label: String
    var isEnabled = true
    var trigger: PressTrigger = .up
    let action: () -> Void

    @State private var isPressed = false

    var body: some View {
        VStack(spacing: Metrics.TopRow.modeLabelSpacing) {
            Image(systemName: symbol)
                .font(Typography.modeIcon)
                .foregroundStyle(Color(iconColor))
                .frame(width: Metrics.TopRow.modeCircle, height: Metrics.TopRow.modeCircle)
                .background(Circle().fill(Color(fill)))
                .overlay(
                    Circle().strokeBorder(
                        Color(isOn ? Tokens.accent : Tokens.strokeStandard),
                        lineWidth: isOn ? Metrics.TopRow.modeBorderOn : Metrics.TopRow.modeBorder)
                )
            Text(title)
                .font(Typography.modeLabel)
                .foregroundStyle(Color(isOn ? Tokens.accent : Tokens.sectionLabel))
        }
        .pressable(label: label, isSelected: isOn, trigger: trigger, onPressing: { isPressed = $0 }) {
            // An assistive press can reach a disabled view through its
            // accessibility action.
            if isEnabled { action() }
        }
        .disabled(!isEnabled)
        .alignmentGuide(.barCenter) { _ in Metrics.TopRow.modeCircle / 2 }
    }

    private var iconColor: ThemeColor {
        if isOn { return Tokens.accent }
        return isEnabled ? Tokens.labelSecondary : Tokens.sectionLabel
    }

    private var fill: ThemeColor {
        if isPressed { return Tokens.keyActive }
        return isEnabled ? Tokens.key : Tokens.keySpecial
    }
}
