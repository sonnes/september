import Foundation

// MARK: - FocusMode
//
// Writing focus modes that dim surrounding text to reduce distraction.
//
//   .disabled   → all text visible at full opacity
//   .sentence   → dims everything except the current sentence
//   .paragraph  → dims everything except the current paragraph
//   .typewriter → keeps current line vertically centered

enum FocusMode: String, CaseIterable, Sendable {
    case disabled
    case sentence
    case paragraph
    case typewriter
}

// MARK: - WriterState
//
// Observable view model for the floating writer.
// Owns focus mode, document stats, syntax/style toggles.

@MainActor
@Observable
final class WriterState {

    // MARK: Focus

    var focusMode: FocusMode = .disabled

    // MARK: Document Stats

    private(set) var wordCount: Int = 0
    private(set) var characterCount: Int = 0
    private(set) var readTimeMinutes: Int = 0

    // MARK: Show Syntax (NLTagger parts of speech)

    var showSyntax: Bool = false

    // MARK: Style Check

    var styleCheckEnabled: Bool = false
    var styleCheckFillers: Bool = false
    var styleCheckCliches: Bool = false
    var styleCheckRedundancies: Bool = false

    // MARK: Document Identity

    var documentName: String?

    var displayName: String {
        documentName ?? "Untitled"
    }

    // MARK: - Stats Calculation

    /// Update word count, character count, and estimated read time.
    /// Call on every text change (debounce at the view layer).
    func updateStats(for text: String) {
        characterCount = text.count

        if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            wordCount = 0
            readTimeMinutes = 0
            return
        }

        // Split on whitespace/newlines, filter empties
        let words = text.components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
        wordCount = words.count

        // Average reading speed: 200 WPM, round up
        if wordCount == 0 {
            readTimeMinutes = 0
        } else {
            readTimeMinutes = max(1, Int(ceil(Double(wordCount) / 200.0)))
        }
    }
}
