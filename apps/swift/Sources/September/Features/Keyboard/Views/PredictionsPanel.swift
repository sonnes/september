import SwiftUI

// MARK: - PredictionsPanel
//
// 3 AI sentence completions displayed as pill-shaped cards above the InputBar.
// Yellow left accent bar on each card. Shows inline error for auth failures.

struct PredictionsPanel: View {
    let predictions: [String]
    let isLoading: Bool
    let error: AIServiceError?
    let onSelect: (String) -> Void

    var body: some View {
        VStack(spacing: 6) {
            if let error, error.isAuthError {
                errorBanner
            }

            ForEach(predictions, id: \.self) { prediction in
                PredictionCard(text: prediction) {
                    onSelect(prediction)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Sentence predictions")
    }

    private var errorBanner: some View {
        HStack(spacing: 6) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 12))
                .foregroundStyle(.yellow)
            Text("API key invalid — check Settings")
                .font(Typography.caption())
                .foregroundStyle(DesignColors.shortcutLabel)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.yellow.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .strokeBorder(Color.yellow.opacity(0.3), lineWidth: 1)
                )
        )
        .accessibilityLabel("Warning: API key is invalid. Open Settings to fix.")
    }
}

// MARK: - PredictionCard

struct PredictionCard: View {
    let text: String
    let onTap: () -> Void

    @State private var isHovered = false

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 0) {
                // Yellow left accent bar
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.yellow)
                    .frame(width: 4)

                Text(text)
                    .font(Typography.body())
                    .foregroundStyle(DesignColors.keyStandardLabel)
                    .lineLimit(1)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(DesignColors.keyStandardFill.opacity(isHovered ? 0.8 : 1.0))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(DesignColors.keyStandardStroke, lineWidth: 1)
                    )
            )
            .shadow(color: .black.opacity(0.12), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
        .accessibilityLabel("Prediction: \(text)")
        .accessibilityHint("Double tap to insert this sentence")
        .accessibilityAddTraits(.isButton)
    }
}
