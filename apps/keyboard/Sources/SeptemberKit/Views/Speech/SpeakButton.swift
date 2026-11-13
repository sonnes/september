import SwiftUI

/// Speak at the right of the input bar. During speech it is Stop. With
/// nothing to speak, such as in a password field, it is off.
public struct SpeakButton: View {
    public enum Mode: Equatable, Sendable {
        case speak
        case stop
        case off

        public init(isSpeaking: Bool, canSpeak: Bool) {
            self = isSpeaking ? .stop : canSpeak ? .speak : .off
        }
    }

    private let mode: Mode
    private let action: () -> Void
    @State private var isPressed = false

    public init(mode: Mode, action: @escaping () -> Void) {
        self.mode = mode
        self.action = action
    }

    public var body: some View {
        HStack(spacing: Metrics.Speak.contentSpacing) {
            Image(systemName: mode == .stop ? "stop.fill" : "speaker.wave.2.fill")
                .resizable()
                .scaledToFit()
                .frame(width: iconSize, height: iconSize)
            Text(mode == .stop ? "Stop" : "Speak")
                .font(Typography.speakButton)
        }
        .foregroundStyle(Color(label))
        .frame(width: Metrics.Speak.button.width, height: Metrics.Speak.button.height)
        .background(Capsule().fill(Color(isPressed ? fill.pressed : fill)))
        .overlay(
            Capsule().strokeBorder(
                Color(Tokens.accent), lineWidth: mode == .stop ? Metrics.Speak.stopBorder : 0)
        )
        .pressable(label: mode == .stop ? "Stop speaking" : "Speak") { pressing in
            isPressed = pressing && mode != .off
        } action: {
            guard mode != .off else { return }
            action()
        }
        .disabled(mode == .off)
    }

    private var iconSize: CGFloat {
        mode == .stop ? Metrics.Speak.stopIcon : Metrics.Speak.speakerIcon
    }

    private var fill: ThemeColor {
        switch mode {
        case .speak: Tokens.accent
        case .stop: Tokens.key
        case .off: Tokens.keySpecial
        }
    }

    private var label: ThemeColor {
        switch mode {
        case .speak: Tokens.onAccent
        case .stop: Tokens.keyText
        case .off: Tokens.labelSecondary
        }
    }
}
