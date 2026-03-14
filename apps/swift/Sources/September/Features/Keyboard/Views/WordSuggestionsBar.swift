import SwiftUI

// MARK: - WordSuggestionsBar
//
// Horizontal row of up to 10 pill-shaped word chips from NSSpellChecker.
// Tap a chip to insert the word + space.

struct WordSuggestionsBar: View {
    let words: [String]
    let onSelect: (String) -> Void

    var body: some View {
        HStack(spacing: 8) {
            ForEach(words, id: \.self) { word in
                WordChip(text: word) {
                    onSelect(word)
                }
            }
            Spacer()
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Word suggestions")
    }
}

// MARK: - WordChip

struct WordChip: View {
    let text: String
    let onTap: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: onTap) {
            Text(text)
                .font(Typography.mono(14))
                .foregroundStyle(DesignColors.keyStandardLabel)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(DesignColors.keyStandardFill.opacity(isHovered ? 0.8 : 1.0))
                )
                .overlay(
                    Capsule()
                        .strokeBorder(DesignColors.keyStandardStroke, lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.1), radius: 3, y: 1)
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
        .accessibilityLabel("Word suggestion: \(text)")
        .accessibilityHint("Double tap to insert")
        .accessibilityAddTraits(.isButton)
    }
}
