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
        HStack(spacing: 6) {
            if let symbol = button.symbol {
                Image(systemName: symbol)
                    .font(.system(size: 14))
                    .foregroundStyle(Color(Tokens.shortcutLabel))
                    .frame(width: 14, height: 14)
            }
            if let hint = button.hint {
                Text(hint)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color(Tokens.shortcutLabel))
            } else {
                Text(button.label)
                    .font(.system(size: 11, weight: .medium))
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
        HStack(spacing: 8) {
            if let symbol = button.symbol {
                Image(systemName: symbol)
                    .font(.system(size: 12))
                    .foregroundStyle(Color(Tokens.labelSecondary))
                    .frame(width: 16, height: 16)
            }
            Text(button.label)
                .font(.system(size: 10))
                .foregroundStyle(Color(Tokens.shortcutLabel))
                .lineLimit(1)
            Spacer(minLength: 4)
            if let hint = button.hint {
                Text(hint)
                    .font(.system(size: 10))
                    .foregroundStyle(Color(Tokens.dualSecondary))
            }
        }
        .padding(.horizontal, 8)
        .frame(width: width, height: Metrics.shortcutFull.height)
        .keyChrome(fill: isPressed ? Tokens.key.pressed : Tokens.key, shadow: false)
        .pressable(label: button.accessibilityLabel) { isPressed = $0 } action: { press() }
    }
}
