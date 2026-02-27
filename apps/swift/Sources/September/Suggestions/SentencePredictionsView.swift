import SwiftUI

struct SentencePredictionsView: View {
    let tracker: TypingTracker

    var body: some View {
        if !tracker.sentencePredictions.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
                ForEach(tracker.sentencePredictions, id: \.self) { sentence in
                    SentenceBubble(sentence: sentence) {
                        tracker.applySentencePrediction(sentence)
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
        }
    }
}

private struct SentenceBubble: View {
    let sentence: String
    let onSelect: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 0) {
                RoundedRectangle(cornerRadius: 1)
                    .fill(Color.orange)
                    .frame(width: 3)
                    .padding(.vertical, 4)

                Text(sentence)
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
            }
            .background(
                isHovered
                    ? Color.accentColor.opacity(0.12)
                    : Color.white.opacity(0.85)
            )
            .cornerRadius(10)
            .shadow(color: .black.opacity(0.08), radius: 2, y: 1)
        }
        .buttonStyle(.plain)
        .dwell(cornerRadius: 10, isHovered: $isHovered, action: onSelect)
    }
}
