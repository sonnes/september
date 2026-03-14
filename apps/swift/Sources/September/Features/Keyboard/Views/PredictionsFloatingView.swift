import SwiftUI

/// Root view for the transparent predictions panel that floats above the keyboard.
/// Contains sentence predictions and word suggestions on a fully clear background.
/// Only renders content when there are actual predictions or word suggestions.
struct PredictionsFloatingView: View {
    let predictionEngine: PredictionEngine
    let axTextService: AXTextService
    let accessibilityManager: AccessibilityManager

    var body: some View {
        VStack(spacing: 8) {
            if !predictionEngine.predictions.isEmpty {
                PredictionsPanel(
                    predictions: predictionEngine.predictions,
                    isLoading: predictionEngine.isLoading,
                    error: predictionEngine.error,
                    onSelect: { handlePredictionSelect($0) }
                )
            }

            if !predictionEngine.wordSuggestions.isEmpty {
                WordSuggestionsBar(
                    words: predictionEngine.wordSuggestions,
                    onSelect: { handleWordSelect($0) }
                )
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, predictionEngine.predictions.isEmpty && predictionEngine.wordSuggestions.isEmpty ? 0 : 8)
    }

    private func handlePredictionSelect(_ sentence: String) {
        predictionEngine.selectPrediction(sentence)
        guard accessibilityManager.isGranted else { return }

        if !axTextService.insertText(sentence) {
            EventInjector.shared.typeString(sentence)
        }
    }

    private func handleWordSelect(_ word: String) {
        predictionEngine.selectWord(word)
        guard accessibilityManager.isGranted else { return }

        let textToInsert = word + " "
        if !axTextService.insertText(textToInsert) {
            EventInjector.shared.typeString(textToInsert)
        }
    }
}
