import SwiftUI

/// Compact shortcut button: icon plus key hint. The keypads either side of
/// the keyboard use it.
public struct ShortcutButtonView: View {
    private let button: PanelButton
    private let width: CGFloat
    private let press: () -> Void

    @State private var isPressed = false

    public init(
        button: PanelButton,
        width: CGFloat = Metrics.shortcutButton.width,
        press: @escaping () -> Void
    ) {
        self.button = button
        self.width = width
        self.press = press
    }

    public var body: some View {
        HStack(spacing: Metrics.Panel.buttonSpacing) {
            if let symbol = button.symbol {
                Image(systemName: symbol)
                    .font(Typography.shortcutButtonIcon)
                    .foregroundStyle(Color(Tokens.shortcutLabel))
                    .frame(width: Metrics.Panel.buttonIcon, height: Metrics.Panel.buttonIcon)
            }
            if let hint = button.hint {
                Text(hint)
                    .font(Typography.shortcutButtonText)
                    .foregroundStyle(Color(Tokens.shortcutLabel))
            } else {
                Text(button.label)
                    .font(Typography.shortcutButtonText)
                    .foregroundStyle(Color(Tokens.shortcutLabel))
                    .lineLimit(1)
            }
        }
        .frame(width: width, height: Metrics.shortcutButton.height)
        .keyChrome(fill: isPressed ? Tokens.key.pressed : Tokens.key)
        .pressable(label: button.accessibilityLabel) { isPressed = $0 } action: { press() }
        .help(button.label)
    }
}

/// Full shortcut row: icon, name and key hint. The app shortcuts panel uses it.
public struct ShortcutFullView: View {
    private let button: PanelButton
    private let width: CGFloat
    private let press: () -> Void

    @State private var isPressed = false

    public init(
        button: PanelButton,
        width: CGFloat = Metrics.shortcutFull.width,
        press: @escaping () -> Void
    ) {
        self.button = button
        self.width = width
        self.press = press
    }

    public var body: some View {
        HStack(spacing: Metrics.Panel.rowSpacing) {
            if let symbol = button.symbol {
                Image(systemName: symbol)
                    .font(Typography.shortcutRowIcon)
                    .foregroundStyle(Color(Tokens.labelSecondary))
                    .frame(width: Metrics.Panel.rowIcon, height: Metrics.Panel.rowIcon)
            }
            Text(button.label)
                .font(Typography.shortcutRowText)
                .foregroundStyle(Color(Tokens.shortcutLabel))
                .lineLimit(1)
            Spacer(minLength: Metrics.Panel.rowMinGap)
            if let hint = button.hint {
                Text(hint)
                    .font(Typography.shortcutRowText)
                    .foregroundStyle(Color(Tokens.dualSecondary))
            }
        }
        .padding(.horizontal, Metrics.Panel.rowPadding)
        .frame(width: width, height: Metrics.shortcutFull.height)
        .keyChrome(fill: isPressed ? Tokens.key.pressed : Tokens.key, shadow: false)
        .pressable(label: button.accessibilityLabel) { isPressed = $0 } action: { press() }
    }
}
