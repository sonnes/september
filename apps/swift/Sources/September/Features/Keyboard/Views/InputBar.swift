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

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16))
                .foregroundStyle(DesignColors.shortcutIcon)

            Text(displayText.isEmpty ? "Type here..." : truncateDisplayText(displayText))
                .font(Typography.mono())
                .foregroundStyle(displayText.isEmpty ? DesignColors.shortcutIcon : DesignColors.keyStandardLabel)
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

            // Mode button placeholders
            HStack(spacing: 4) {
                modeButton("keyboard", active: true)
                modeButton("speaker.wave.2", active: false)
                modeButton("pencil", active: false)
                modeButton("gearshape", active: false)
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
                    .strokeBorder(active ? DesignColors.kbAccent.opacity(0.3) : Color.clear, lineWidth: 1)
            )
    }
}
