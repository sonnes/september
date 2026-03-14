import AppKit
import Foundation
import os

// MARK: - PredictionEngine
//
// Owns AI sentence prediction and spell-check word suggestion logic.
// Debounces input, cancels in-flight requests, and maintains optimistic UI.
//
//   textDidChange(text)
//       │
//       ├── Synchronous: NSSpellChecker.completions() → wordSuggestions
//       │
//       └── Debounce (300ms) → cancel in-flight → AI call
//               │
//               ├── Parse JSON array → predictions
//               ├── Invalid JSON → keep stale predictions
//               └── Error → set error property, keep stale
//
// @MainActor because predictions/wordSuggestions/isLoading are observed by SwiftUI.

@MainActor
@Observable
final class PredictionEngine {
    // MARK: - Observable State

    var predictions: [String] = []
    var wordSuggestions: [String] = []
    var isLoading: Bool = false
    var error: AIServiceError?

    // MARK: - Internal

    private var debounceTask: Task<Void, Never>?
    private var generationTask: Task<Void, Never>?
    private var lastRequestedText: String = ""
    private let debounceInterval: Duration
    private var aiService: (any AIService)?
    private var temperature: Double = 0.7
    private let spellChecker = NSSpellChecker.shared
    private static let logger = Logger(subsystem: "to.september.app", category: "PredictionEngine")

    // MARK: - System Prompt (mirrors web app's use-suggestions.ts)

    private static let systemPrompt = """
        Generate 3 possible sentence completions for what the user is currently typing.
        Complete their current thought naturally. Match their tone and style.
        Return ONLY a JSON array of 3 strings, no other text.
        """

    init(debounceInterval: Duration = .milliseconds(300)) {
        self.debounceInterval = debounceInterval
    }

    // MARK: - Public API

    func textDidChange(_ text: String) {
        // Word suggestions are synchronous — update immediately
        updateWordSuggestions(for: text)

        // Sentence predictions are debounced
        debounceTask?.cancel()
        debounceTask = Task {
            if debounceInterval > .zero {
                try? await Task.sleep(for: debounceInterval)
            }
            guard !Task.isCancelled else { return }
            await generatePredictions(for: text)
        }
    }

    func selectPrediction(_ prediction: String) {
        predictions = []
    }

    func selectWord(_ word: String) {
        wordSuggestions.removeAll { $0 == word }
    }

    /// Swap the AI service at runtime (e.g., when user changes provider in settings).
    func configure(provider: AIProvider, apiKey: String?, model: String?, temperature: Double = 0.7) {
        cancelAllTasks()
        self.temperature = temperature
        aiService = AIServiceFactory.create(provider: provider, apiKey: apiKey, model: model)
        if aiService == nil {
            error = .providerUnavailable
        } else {
            error = nil
        }
    }

    /// For testing: inject a mock service directly.
    func configureWithService(_ service: any AIService) {
        cancelAllTasks()
        aiService = service
        error = nil
    }

    // MARK: - Private: Sentence Predictions

    private func generatePredictions(for text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            predictions = []
            isLoading = false
            return
        }

        guard let service = aiService else {
            error = .providerUnavailable
            Self.logger.debug("No AI service configured")
            return
        }

        // Cancel in-flight request
        generationTask?.cancel()
        isLoading = true
        lastRequestedText = trimmed

        generationTask = Task {
            do {
                let response = try await service.generateText(
                    prompt: "Current text: \(trimmed)",
                    system: Self.systemPrompt,
                    temperature: temperature
                )

                guard !Task.isCancelled else { return }

                // Check if text is still relevant
                guard !lastRequestedText.isEmpty else {
                    predictions = []
                    isLoading = false
                    return
                }

                if let parsed = parsePredictions(response) {
                    predictions = Array(parsed.prefix(3))
                    error = nil
                    Self.logger.debug("Parsed \(parsed.count) predictions")
                } else {
                    Self.logger.warning("Failed to parse predictions, keeping stale")
                }
            } catch is CancellationError {
                return
            } catch let serviceError as AIServiceError {
                guard !Task.isCancelled else { return }
                if serviceError.isAuthError {
                    error = serviceError
                }
                Self.logger.error("AI error: \(serviceError.localizedDescription)")
            } catch {
                guard !Task.isCancelled else { return }
                Self.logger.error("Unexpected error: \(error.localizedDescription)")
            }
            isLoading = false
        }
    }

    // MARK: - Private: Word Suggestions (NSSpellChecker)

    private func updateWordSuggestions(for text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            wordSuggestions = []
            return
        }

        // Extract the last partial word being typed
        let words = trimmed.components(separatedBy: .whitespacesAndNewlines)
        guard let lastWord = words.last, !lastWord.isEmpty else {
            wordSuggestions = []
            return
        }

        // If the text ends with a space, the user finished the word — no completions needed
        if text.last?.isWhitespace == true {
            wordSuggestions = []
            return
        }

        let range = NSRange(location: 0, length: lastWord.utf16.count)
        let completions =
            spellChecker.completions(
                forPartialWordRange: range,
                in: lastWord,
                language: spellChecker.language(),
                inSpellDocumentWithTag: 0
            ) ?? []

        wordSuggestions = Array(completions.prefix(10))
    }

    // MARK: - Private: JSON Parsing

    /// Parse AI response as a JSON array of strings.
    /// Strips markdown code fences if present.
    private func parsePredictions(_ response: String) -> [String]? {
        var cleaned = response.trimmingCharacters(in: .whitespacesAndNewlines)

        // Strip markdown fences: ```json ... ``` or ``` ... ```
        if cleaned.hasPrefix("```") {
            // Remove opening fence (with optional language tag)
            if let firstNewline = cleaned.firstIndex(of: "\n") {
                cleaned = String(cleaned[cleaned.index(after: firstNewline)...])
            }
            // Remove closing fence
            if cleaned.hasSuffix("```") {
                cleaned = String(cleaned.dropLast(3))
            }
            cleaned = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        guard let data = cleaned.data(using: .utf8),
            let array = try? JSONDecoder().decode([String].self, from: data)
        else {
            return nil
        }

        return array
    }

    // MARK: - Private: Task Management

    private func cancelAllTasks() {
        debounceTask?.cancel()
        debounceTask = nil
        generationTask?.cancel()
        generationTask = nil
        isLoading = false
    }
}
