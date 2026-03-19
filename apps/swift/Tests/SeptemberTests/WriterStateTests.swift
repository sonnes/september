import Testing

@testable import September

@Suite("WriterState")
@MainActor
struct WriterStateTests {

    // MARK: - Focus Mode

    @Test("Default focus mode is disabled")
    func defaultFocusMode() {
        let state = WriterState()
        #expect(state.focusMode == .disabled)
    }

    @Test("Toggle focus mode")
    func toggleFocusMode() {
        let state = WriterState()
        state.focusMode = .paragraph
        #expect(state.focusMode == .paragraph)
        state.focusMode = .sentence
        #expect(state.focusMode == .sentence)
        state.focusMode = .typewriter
        #expect(state.focusMode == .typewriter)
        state.focusMode = .disabled
        #expect(state.focusMode == .disabled)
    }

    // MARK: - Word Count / Stats

    @Test("Empty text stats")
    func emptyTextStats() {
        let state = WriterState()
        state.updateStats(for: "")
        #expect(state.wordCount == 0)
        #expect(state.characterCount == 0)
        #expect(state.readTimeMinutes == 0)
    }

    @Test("Word count for simple text")
    func wordCount() {
        let state = WriterState()
        state.updateStats(for: "Hello world this is a test")
        #expect(state.wordCount == 6)
        #expect(state.characterCount == 26)
    }

    @Test("Read time calculation at 200 WPM")
    func readTime() {
        let state = WriterState()
        // 200 words = 1 minute
        let words = Array(repeating: "word", count: 200).joined(separator: " ")
        state.updateStats(for: words)
        #expect(state.wordCount == 200)
        #expect(state.readTimeMinutes == 1)
    }

    @Test("Read time rounds up")
    func readTimeRoundsUp() {
        let state = WriterState()
        let words = Array(repeating: "word", count: 250).joined(separator: " ")
        state.updateStats(for: words)
        #expect(state.readTimeMinutes == 2)
    }

    @Test("Word count handles multiple spaces and newlines")
    func wordCountWhitespace() {
        let state = WriterState()
        state.updateStats(for: "  hello   world  \n\n  test  ")
        #expect(state.wordCount == 3)
    }

    // MARK: - Show Syntax

    @Test("Default syntax highlighting is off")
    func defaultSyntax() {
        let state = WriterState()
        #expect(state.showSyntax == false)
    }

    @Test("Toggle syntax highlighting")
    func toggleSyntax() {
        let state = WriterState()
        state.showSyntax = true
        #expect(state.showSyntax == true)
    }

    // MARK: - Style Check

    @Test("Default style check is disabled")
    func defaultStyleCheck() {
        let state = WriterState()
        #expect(state.styleCheckEnabled == false)
    }

    @Test("Style check categories are independently togglable")
    func styleCheckCategories() {
        let state = WriterState()
        state.styleCheckEnabled = true
        state.styleCheckFillers = true
        state.styleCheckCliches = true
        state.styleCheckRedundancies = false
        #expect(state.styleCheckFillers == true)
        #expect(state.styleCheckCliches == true)
        #expect(state.styleCheckRedundancies == false)
    }

    // MARK: - Document Binding

    @Test("Document name defaults to Untitled")
    func documentDisplayName() {
        let state = WriterState()
        #expect(state.displayName == "Untitled")
    }

    @Test("Document name from document")
    func documentNameFromDoc() {
        let state = WriterState()
        state.documentName = "Meeting Notes.md"
        #expect(state.displayName == "Meeting Notes.md")
    }
}
