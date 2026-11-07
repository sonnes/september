import AppKit
import Combine

/// Write: the paper with the native editor, and the documents in the
/// folder of Write.
///
/// The editor saves the open document 0.12 seconds after the last edit, and
/// before another document opens, so Write has no Save command. A link to
/// a document opens that document. A web link opens in the browser.
@MainActor
public final class WriteController {
    public let model: WriteModel
    public let paper: WritePaperController
    /// Called with the paragraph at the caret after each edit or caret move.
    /// The keyboard cannot read its own window through the accessibility
    /// API, so the input bar reads the editor here.
    public var onCaretChange: ((EditorCaret) -> Void)?

    /// The time between the last edit and the save.
    static let saveDelay: TimeInterval = 0.12

    private let openURL: (URL) -> Void
    private var started = false
    private var pendingSave: DispatchWorkItem?
    private var failure: AnyCancellable?

    public init(
        library: DocumentLibrary = DocumentLibrary(),
        openURL: @escaping (URL) -> Void = { NSWorkspace.shared.open($0) }
    ) {
        model = WriteModel(library: library)
        paper = WritePaperController()
        self.openURL = openURL

        let editor = paper.editor
        model.show = { [weak editor] text in
            guard let editor else { return }
            if text.isEmpty { editor.loadNewDocument() } else { editor.load(text) }
        }
        model.editorText = { [weak editor] in editor?.markdown ?? "" }
        editor.onTextChange = { [weak self] in self?.scheduleSave() }
        editor.onCaretChange = { [weak self] caret in self?.onCaretChange?(caret) }
        editor.onOpenLink = { [weak self] link in self?.open(link) }
        paper.window.onNewDocument = { [weak self] in self?.newDocument() }
        paper.onClose = { [weak self] in self?.save() }
        failure = model.$failure.sink { [weak paper] text in paper?.showNotice(text) }
    }

    /// Lists the folder and shows the newest document. Only the first call
    /// does this.
    public func start() {
        guard !started else { return }
        started = true
        model.start()
    }

    /// Opens the paper, or brings it to the front. See
    /// `WritePaperController.show(from:floor:screen:margin:)`.
    public func show(from bar: CGRect?, floor: CGFloat, screen: CGRect, margin: CGFloat) {
        start()
        paper.show(from: bar, floor: floor, screen: screen, margin: margin)
    }

    /// Saves the open document now. Call it before the app quits.
    public func save() {
        pendingSave?.cancel()
        pendingSave = nil
        model.save()
    }

    /// True while the paper is the key window.
    public var isKey: Bool { paper.window.isKeyWindow }

    /// The paragraph at the caret.
    public var caret: EditorCaret { paper.editor.caret }

    /// The selection and the document, for Speak.
    public var speech: EditorSpeech { paper.editor.speech }

    private func scheduleSave() {
        guard started else { return }
        pendingSave?.cancel()
        let save = DispatchWorkItem { [weak self] in self?.save() }
        pendingSave = save
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.saveDelay, execute: save)
    }

    private func newDocument() {
        pendingSave?.cancel()
        model.newDocument()
    }

    private func open(_ link: WriteLink) {
        switch link {
        case .wiki(let target):
            pendingSave?.cancel()
            model.openLink(title: target)
        case .url(let text):
            guard let url = URL(string: text),
                ["http", "https", "mailto"].contains(url.scheme?.lowercased() ?? "")
            else { return }
            openURL(url)
        }
    }
}
