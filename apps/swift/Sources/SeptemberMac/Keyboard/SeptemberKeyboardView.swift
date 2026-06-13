import SwiftUI

public struct SeptemberKeyboardView: View {
    private let layout: QWERTYKeyboardLayout
    @State private var typedText = ""

    public init(layout: QWERTYKeyboardLayout = .default) {
        self.layout = layout
    }

    public var body: some View {
        VStack(spacing: 0) {
            titleBar
            composer
            suggestions
            keyboardGrid
        }
        .background(SeptemberKeyboardColors.panel)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(SeptemberKeyboardColors.borderStrong)
        )
        .shadow(color: .black.opacity(0.14), radius: 30, y: 18)
        .padding(24)
        .frame(minWidth: 960, minHeight: 520)
    }

    private var titleBar: some View {
        HStack {
            HStack(spacing: 9) {
                Circle().stroke(SeptemberKeyboardColors.borderStrong).frame(width: 10, height: 10)
                Circle().stroke(SeptemberKeyboardColors.borderStrong).frame(width: 10, height: 10)
            }

            Spacer()
            Text("September Keyboard - QWERTY")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(SeptemberKeyboardColors.foreground)
            Spacer()
            Circle()
                .fill(SeptemberKeyboardColors.primary)
                .frame(width: 10, height: 10)
                .accessibilityHidden(true)
        }
        .padding(.horizontal, 16)
        .frame(height: 44)
        .background(SeptemberKeyboardColors.panelSoft)
        .overlay(alignment: .bottom) {
            Divider()
        }
    }

    private var composer: some View {
        HStack(spacing: 12) {
            Text(typedText.isEmpty ? "I want to say..." : typedText)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(typedText.isEmpty ? SeptemberKeyboardColors.muted : SeptemberKeyboardColors.foreground)
                .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                .padding(.horizontal, 16)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(SeptemberKeyboardColors.border)
                )
                .accessibilityLabel("Current text")

            Button("Speak") {}
                .font(.system(size: 16, weight: .bold))
                .buttonStyle(PrimaryKeyboardButtonStyle())
                .accessibilityHint("Speaks the composed text")
        }
        .padding(16)
        .background(SeptemberKeyboardColors.panelSoft)
    }

    private var suggestions: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(["Yes", "No", "Thank you", "One moment", "I need help"], id: \.self) { suggestion in
                    Button(suggestion) {
                        appendSuggestion(suggestion)
                    }
                    .buttonStyle(SuggestionButtonStyle())
                    .accessibilityHint("Inserts suggestion")
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 14)
        }
        .background(SeptemberKeyboardColors.panelSoft)
        .overlay(alignment: .bottom) {
            Divider()
        }
    }

    private var keyboardGrid: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            VStack(spacing: 8) {
                ForEach(layout.rows) { row in
                    HStack(spacing: 8) {
                        ForEach(row.keys) { key in
                            KeyboardKeyButton(key: key) {
                                handle(key)
                            }
                        }
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity)
        }
        .background(Color.white)
    }

    private func appendSuggestion(_ suggestion: String) {
        if typedText.isEmpty {
            typedText = suggestion
        } else {
            typedText += " \(suggestion)"
        }
    }

    private func handle(_ key: KeyboardKey) {
        switch key.label {
        case "Delete":
            if !typedText.isEmpty {
                typedText.removeLast()
            }
        default:
            if let output = key.output {
                typedText += output
            }
        }
    }
}

private struct KeyboardKeyButton: View {
    let key: KeyboardKey
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(key.label)
                .font(.system(size: fontSize, weight: .semibold))
                .frame(width: key.size.width, height: key.size.height)
        }
        .buttonStyle(KeyButtonStyle(role: key.role))
        .accessibilityLabel(key.accessibilityLabel)
    }

    private var fontSize: Double {
        key.role == .utility ? 14 : 16
    }
}

private struct KeyButtonStyle: ButtonStyle {
    let role: KeyboardKeyRole

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(foreground)
            .background(background(configuration: configuration))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(border)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }

    private var foreground: Color {
        role == .primary ? SeptemberKeyboardColors.primaryText : SeptemberKeyboardColors.foreground
    }

    private var border: Color {
        role == .primary ? SeptemberKeyboardColors.primaryBorder : SeptemberKeyboardColors.border
    }

    private func background(configuration: Configuration) -> Color {
        if role == .primary {
            return configuration.isPressed ? SeptemberKeyboardColors.primaryPressed : SeptemberKeyboardColors.primarySoft
        }

        if role == .utility || role == .modifier {
            return configuration.isPressed ? SeptemberKeyboardColors.utilityPressed : SeptemberKeyboardColors.utility
        }

        return configuration.isPressed ? SeptemberKeyboardColors.keyPressed : SeptemberKeyboardColors.key
    }
}

private struct PrimaryKeyboardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: 112, height: 48)
            .foregroundStyle(.white)
            .background(configuration.isPressed ? SeptemberKeyboardColors.primaryPressed : SeptemberKeyboardColors.primary)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

private struct SuggestionButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(SeptemberKeyboardColors.primaryText)
            .padding(.horizontal, 18)
            .frame(minHeight: 44)
            .background(configuration.isPressed ? SeptemberKeyboardColors.primaryPressed : SeptemberKeyboardColors.primarySoft)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(SeptemberKeyboardColors.primaryBorder))
    }
}

private enum SeptemberKeyboardColors {
    static let foreground = Color(red: 24 / 255, green: 24 / 255, blue: 27 / 255)
    static let muted = Color(red: 113 / 255, green: 113 / 255, blue: 122 / 255)
    static let panel = Color.white
    static let panelSoft = Color(red: 250 / 255, green: 250 / 255, blue: 250 / 255)
    static let border = Color(red: 212 / 255, green: 212 / 255, blue: 216 / 255)
    static let borderStrong = Color(red: 161 / 255, green: 161 / 255, blue: 170 / 255)
    static let primary = Color(red: 79 / 255, green: 70 / 255, blue: 229 / 255)
    static let primaryText = Color(red: 55 / 255, green: 48 / 255, blue: 163 / 255)
    static let primarySoft = Color(red: 238 / 255, green: 242 / 255, blue: 255 / 255)
    static let primaryPressed = Color(red: 224 / 255, green: 231 / 255, blue: 255 / 255)
    static let primaryBorder = Color(red: 199 / 255, green: 210 / 255, blue: 254 / 255)
    static let key = Color(red: 250 / 255, green: 250 / 255, blue: 250 / 255)
    static let keyPressed = Color(red: 244 / 255, green: 244 / 255, blue: 245 / 255)
    static let utility = Color(red: 244 / 255, green: 244 / 255, blue: 245 / 255)
    static let utilityPressed = Color(red: 228 / 255, green: 228 / 255, blue: 231 / 255)
}
