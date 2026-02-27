import AppKit

@MainActor
final class SuggestionEngine {
    private let spellChecker = NSSpellChecker.shared
    private let spellTag = NSSpellChecker.uniqueSpellDocumentTag()

    /// Generate word completions based on the full text before the cursor.
    /// Only returns suggestions when the user is mid-word.
    func suggestions(for textBeforeCursor: String) -> [String] {
        let trimmed = textBeforeCursor.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return [] }

        // Only suggest when mid-word (not after a space)
        guard textBeforeCursor.last?.isWhitespace != true else { return [] }

        let context = limitedContext(trimmed, maxWords: 50)
        let words = context.split(separator: " ")
        let partial = words.last.map(String.init) ?? ""

        let range = NSRange(
            location: context.count - partial.count,
            length: partial.count
        )
        return spellChecker.completions(
            forPartialWordRange: range,
            in: context,
            language: nil,
            inSpellDocumentWithTag: spellTag
        ) ?? []
    }

    private func limitedContext(_ text: String, maxWords: Int) -> String {
        let words = text.split(separator: " ")
        if words.count <= maxWords { return text }
        return words.suffix(maxWords).joined(separator: " ")
    }
}
