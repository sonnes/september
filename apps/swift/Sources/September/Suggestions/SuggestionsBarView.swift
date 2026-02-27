import SwiftUI

struct SuggestionsBarView: View {
    let tracker: TypingTracker

    var body: some View {
        HStack(spacing: 6) {
            if tracker.suggestions.isEmpty {
                Text("Type to see suggestions")
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
            } else {
                ForEach(tracker.suggestions, id: \.self) { word in
                    SuggestionChip(word: word) {
                        tracker.applySuggestion(word)
                    }
                }
            }
        }
        .frame(height: 32, alignment: .leading)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 8)
        .fixedSize(horizontal: false, vertical: true)
        .clipped()
    }
}

private struct SuggestionChip: View {
    let word: String
    let onSelect: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: onSelect) {
            Text(word)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .fixedSize()
                .padding(.horizontal, 10)
                .frame(height: 26)
                .background(isHovered ? Color.accentColor.opacity(0.15) : Color.gray.opacity(0.12))
                .cornerRadius(5)
        }
        .buttonStyle(.plain)
        .dwell(cornerRadius: 5, isHovered: $isHovered, action: onSelect)
    }
}
