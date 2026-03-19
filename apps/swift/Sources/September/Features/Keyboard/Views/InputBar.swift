import SwiftData
import SwiftUI

/// Truncates display text to a maximum length, keeping the most recent characters.
func truncateDisplayText(_ text: String, maxLength: Int = 500) -> String {
    guard text.count > maxLength else { return text }
    return String(text.suffix(maxLength))
}

/// 980×48pt input bar showing typed text with cursor indicator.
/// Display-only — the real input goes to the focused app via CGEvent.
struct InputBar: View {
    @Binding var displayText: String
    var isSpeaking: Bool = false
    var onSpeakTapped: () -> Void = {}
    var onWriterTapped: () -> Void = {}
    var onSettingsTapped: () -> Void = {}

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16))
                .foregroundStyle(DesignColors.shortcutIcon)

            Text(displayText.isEmpty ? "Type here..." : truncateDisplayText(displayText))
                .font(Typography.mono())
                .foregroundStyle(
                    displayText.isEmpty ? DesignColors.shortcutIcon : DesignColors.keyStandardLabel
                )
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            if !displayText.isEmpty {
                Button {
                    displayText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(DesignColors.shortcutIcon)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear text")
            }

            // Mode buttons
            HStack(spacing: 4) {
                modeButton("keyboard", active: true)

                // Speak / Stop button
                Button(action: onSpeakTapped) {
                    Image(systemName: isSpeaking ? "stop.fill" : "speaker.wave.2")
                        .font(.system(size: 14))
                        .foregroundStyle(
                            isSpeaking ? DesignColors.kbAccent : DesignColors.shortcutIcon)
                        .frame(width: 32, height: 32)
                        .background(
                            Circle()
                                .fill(
                                    isSpeaking
                                        ? DesignColors.kbAccent.opacity(0.15) : Color.clear)
                        )
                        .overlay(
                            Circle()
                                .strokeBorder(
                                    isSpeaking
                                        ? DesignColors.kbAccent.opacity(0.5) : Color.clear,
                                    lineWidth: 1.5
                                )
                                .scaleEffect(isSpeaking ? 1.2 : 1.0)
                                .opacity(isSpeaking ? 0.6 : 0)
                                .animation(
                                    isSpeaking
                                        ? .easeInOut(duration: 0.8).repeatForever(
                                            autoreverses: true) : .default,
                                    value: isSpeaking
                                )
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(isSpeaking ? "Stop speaking" : "Speak text")
                .accessibilityHint(
                    isSpeaking
                        ? "Stops current speech" : "Speaks the typed text aloud")

                Button(action: onWriterTapped) {
                    modeButton("pencil", active: false)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Writer")
                .accessibilityHint("Opens the floating markdown editor")

                Button(action: onSettingsTapped) {
                    Image(systemName: "gearshape")
                        .font(.system(size: 14))
                        .foregroundStyle(DesignColors.shortcutIcon)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Settings")
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 48)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(DesignColors.keyStandardFill)
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .strokeBorder(Color.white.opacity(0.06), lineWidth: 1)
                )
        )
    }

    private func modeButton(_ icon: String, active: Bool) -> some View {
        Image(systemName: icon)
            .font(.system(size: 14))
            .foregroundStyle(active ? DesignColors.kbAccent : DesignColors.shortcutIcon)
            .frame(width: 32, height: 32)
            .background(
                Circle()
                    .fill(active ? DesignColors.kbAccent.opacity(0.15) : Color.clear)
            )
            .overlay(
                Circle()
                    .strokeBorder(
                        active ? DesignColors.kbAccent.opacity(0.3) : Color.clear, lineWidth: 1)
            )
    }
}
