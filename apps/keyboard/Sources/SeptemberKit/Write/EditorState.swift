import Foundation

/// The paragraph at the caret of the Write editor. The offsets are UTF-16
/// units, the same as the accessibility API.
public struct EditorCaret: Equatable, Sendable {
    public let text: String
    public let caret: Int
    public let length: Int
    public let documentIsEmpty: Bool

    public init(text: String, caret: Int, length: Int, documentIsEmpty: Bool = false) {
        self.text = text
        self.caret = caret
        self.length = length
        self.documentIsEmpty = documentIsEmpty
    }
}

/// What Speak reads in Write.
public struct EditorSpeech: Equatable, Sendable {
    /// The selected text of the editor, with no Markdown marks, or empty.
    public let selection: String
    /// The Markdown of the open document.
    public let markdown: String

    public init(selection: String, markdown: String) {
        self.selection = selection
        self.markdown = markdown
    }

    /// The selection, or the whole document without its Markdown marks when
    /// nothing is selected. `nil` when there is nothing to read.
    public var text: String? {
        let selected = selection.trimmingCharacters(in: .whitespacesAndNewlines)
        let text = selected.isEmpty ? MarkdownSpeech.plainText(markdown) : selected
        return text.isEmpty ? nil : text
    }
}
