import SwiftUI

/// Compact shortcut button — icon plus key hint. Used in the edit and navigate
/// keypads either side of the keyboard.
public struct ShortcutButtonView: View {
    private let button: PanelButton
    private let tint: RGBA
    private let width: CGFloat
    private let press: () -> Void

    @State private var isPressed = false

    public init(
        button: PanelButton,
        tint: RGBA = Tokens.shortcutLabel,
        width: CGFloat = Metrics.shortcutButton.width,
        press: @escaping () -> Void
    ) {
        self.button = button
        self.tint = tint
        self.width = width
        self.press = press
    }

    public var body: some View {
        HStack(spacing: 6) {
            if let symbol = button.symbol {
                Image(systemName: symbol)
                    .font(.system(size: 14))
                    .foregroundStyle(Color(tint))
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
        .background(
            RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                .fill(Color(isPressed ? Tokens.key.lightened(by: 0.08) : Tokens.key))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                .strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1)
        )
        .shadow(color: Color(Tokens.keyShadow), radius: 1, y: 1)
        .contentShape(Rectangle())
        .onTapGesture { press() }
        .onLongPressGesture(minimumDuration: 0.4, pressing: { isPressed = $0 }, perform: {})
        .accessibilityElement()
        .accessibilityLabel(button.accessibilityLabel)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { press() }
        .help(button.label)
    }
}

/// Full shortcut row — icon, name and key hint. Used by the app shortcuts panel.
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
        .background(
            RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                .fill(Color(isPressed ? Tokens.key.lightened(by: 0.08) : Tokens.key))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.keyCornerRadius, style: .continuous)
                .strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1)
        )
        .contentShape(Rectangle())
        .onTapGesture { press() }
        .onLongPressGesture(minimumDuration: 0.4, pressing: { isPressed = $0 }, perform: {})
        .accessibilityElement()
        .accessibilityLabel(button.accessibilityLabel)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { press() }
    }
}
