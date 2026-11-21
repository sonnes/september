import CoreGraphics
import Foundation

/// The Markdown editor of the Write paper: the editor of Hubble.md, on the
/// editor page of Piper.
///
/// The page sends a state after each edit, caret move, and change of size.
/// The editor keeps the last state, so the model, the input bar, and Speak
/// read the text and the caret with no wait. A state of an earlier document
/// changes nothing. A load of a document is not an edit.
@MainActor
public final class WriteWebEditor: WriteEditing {
    public let page: any EditorPage

    /// The user changed the text.
    public var onTextChange: (() -> Void)?
    /// The text or the caret changed.
    public var onCaretChange: ((EditorCaret) -> Void)?
    /// The user opened a link.
    public var onOpenLink: ((WriteLink) -> Void)?
    /// The height of the text changed.
    public var onLayoutChange: (() -> Void)?

    public private(set) var text = ""
    public private(set) var caret = EditorCaret(text: "", caret: 0, length: 0, documentIsEmpty: true)
    /// The height of the text with the margins of the paper.
    public private(set) var contentHeight: CGFloat = 2 * Metrics.WriteEditor.paperMargin
    private var selection = ""
    private var opens = 0
    private var mode = "rich"
    /// The text that the page opened with. A new document opens as an empty heading.
    private var opened = ""

    public init(page: any EditorPage) {
        self.page = page
        page.onMessage = { [weak self] message in self?.receive(message) }
        page.onReload = { [weak self] in self?.reload() }
        page.send(.theme(.write))
    }

    /// Shows the Markdown of a document. An empty text is a new document,
    /// which starts with an empty heading.
    public func show(_ text: String) {
        self.text = text
        selection = ""
        caret = EditorCaret(text: "", caret: 0, length: 0, documentIsEmpty: text.isEmpty)
        mode = "rich"
        opened = text.isEmpty ? "# " : text
        open()
    }

    /// Selects the text of the title, for Rename.
    public func selectTitle() {
        page.send(.selectTitle)
    }

    public var speech: EditorSpeech {
        EditorSpeech(selection: selection, markdown: text)
    }

    private func open() {
        opens += 1
        page.send(.open(EditorOpenRequest(path: "write-\(opens)", text: opened, mode: mode), number: opens))
    }

    private func reload() {
        page.send(.theme(.write))
        if !text.isEmpty { opened = text }
        open()
    }

    private func receive(_ message: EditorMessage) {
        switch message {
        case .state(let state):
            guard state.open == opens else { return }
            apply(state)
        case .link(let link):
            onOpenLink?(link)
        case .lossy(let reasons):
            guard !reasons.isEmpty, mode == "rich" else { return }
            mode = "source"
            open()
        case .ready, .unused:
            break
        }
    }

    private func apply(_ state: EditorPageState) {
        selection = state.selection
        let height = CGFloat(state.height)
        if height != contentHeight {
            contentHeight = height
            onLayoutChange?()
        }
        // The page gives the opened text back before the first key press. A
        // new document is empty until the user types.
        let edited = state.text != text && !(text.isEmpty && state.text == opened)
        if edited { text = state.text }
        let moved = state.caret.map { $0 != caret } ?? false
        if let next = state.caret { caret = next }
        if edited { onTextChange?() }
        if edited || moved { onCaretChange?(caret) }
    }
}
