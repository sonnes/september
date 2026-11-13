import AppKit
import Combine

/// Write: the paper with the native editor, and the desk with the documents
/// in the folder of Write.
///
/// The editor saves the open document 0.12 seconds after the last edit, and
/// before another document opens, so Write has no Save command. A link to
/// a document opens that document. A web link opens in the browser.
///
/// Command-O turns the paper into the desk: the paper shrinks into its card,
/// and the other documents rise out of the bar as cards. The open card grows
/// back into the paper.
@MainActor
public final class WriteController {
    public let model: WriteModel
    public let paper: WritePaperController
    public let desk: WriteDeskController
    /// Called with the paragraph at the caret after each edit or caret move,
    /// and with the Find query while the desk is open. The keyboard cannot
    /// read its own window through the accessibility API, so the input bar
    /// reads the editor here.
    public var onCaretChange: ((EditorCaret) -> Void)?
    /// Called with the panel of Write when the desk opens or closes.
    public var onPanelChange: ((String) -> Void)?
    /// Called with `true` when the paper or the desk becomes the key window,
    /// and with `false` when it stops being the key window.
    public var onKeyChanged: ((Bool) -> Void)? {
        didSet {
            paper.onKeyChanged = onKeyChanged
            desk.onKeyChanged = onKeyChanged
        }
    }
    /// Brings the paper or the desk to the front with the focus. The keyboard
    /// passes `AppActivation.bringToFront`, which handles a press through
    /// `AXPress`.
    public var bringToFront: (NSWindow) -> Void = { window in
        NSApp.activate()
        window.makeKeyAndOrderFront(nil)
    } {
        didSet {
            paper.bringToFront = bringToFront
            desk.bringToFront = bringToFront
        }
    }
    /// Called when Write closes, so that its window does not wait for the focus.
    public var windowClosed: (NSWindow) -> Void = { _ in } {
        didSet { paper.windowClosed = windowClosed }
    }

    /// The time between the last edit and the save.
    static let saveDelay: TimeInterval = 0.12

    private let openURL: (URL) -> Void
    private let reveal: (URL) -> Void
    private var started = false
    private var pendingSave: DispatchWorkItem?
    private var failure: AnyCancellable?
    /// Where the paper opened last: the desk uses the same space.
    private var placement: (bar: CGRect?, floor: CGFloat, screen: CGRect, margin: CGFloat)?

    /// - Parameters:
    ///   - openURL: opens a web or mail link.
    ///   - reveal: shows a file in Finder.
    public init(
        library: DocumentLibrary = DocumentLibrary(),
        openURL: @escaping (URL) -> Void = { NSWorkspace.shared.open($0) },
        reveal: @escaping (URL) -> Void = { NSWorkspace.shared.activateFileViewerSelecting([$0]) }
    ) {
        model = WriteModel(library: library)
        paper = WritePaperController()
        desk = WriteDeskController()
        self.openURL = openURL
        self.reveal = reveal

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
        paper.window.onShowDocuments = { [weak self] in self?.showDesk() }
        paper.onClose = { [weak self] in self?.save() }
        failure = model.$failure.sink { [weak paper] text in paper?.showNotice(text) }

        let library = model.library
        desk.preview = { document in
            let text = (try? library.read(document)) ?? ""
            return DocumentLibrary.preview(of: text, lines: Metrics.Desk.cardLines)
        }
        desk.onCommand = { [weak self] command in self?.perform(command) }
        desk.onQueryChange = { [weak self] _ in
            guard let self else { return }
            onCaretChange?(caret)
        }
        desk.onUndoEnd = { [weak self] in self?.model.forgetTrash() }
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
        placement = (bar, floor, screen, margin)
        if desk.isOpen {
            bringToFront(desk.window)
            return
        }
        if model.current == nil { model.start() }
        paper.show(from: bar, floor: floor, screen: screen, margin: margin)
    }

    /// True while the desk of documents is open.
    public var isDeskOpen: Bool { desk.isOpen }

    /// The panel of Write: the Documents keys while the desk is open,
    /// and the Write keys on the paper.
    public var panel: String { desk.isOpen ? WritePanel.documentsID : WritePanel.id }

    /// Opens the desk. The open document saves first, and the paper shrinks
    /// into its card.
    public func showDesk() {
        guard !desk.isOpen else { return }
        start()
        save()
        let (area, centre) = deskArea
        desk.show(documents: model.documents, current: model.current?.url, area: area, centre: centre)
        paper.shrink(into: desk.cardFrame(of: model.current?.url))
        onPanelChange?(panel)
    }

    /// Saves the open document now. Call it before the app quits.
    public func save() {
        pendingSave?.cancel()
        pendingSave = nil
        model.save()
    }

    /// True while the paper or the desk is the key window.
    public var isKey: Bool { paper.window.isKeyWindow || desk.window.isKeyWindow }

    /// The paragraph at the caret, or the Find query on the desk.
    public var caret: EditorCaret {
        guard desk.isOpen else { return paper.editor.caret }
        let query = desk.desk.query
        return EditorCaret(text: query, caret: (query as NSString).length, length: 0)
    }

    /// The selection and the document for Speak, or the Find query on the desk.
    public var speech: EditorSpeech {
        desk.isOpen ? EditorSpeech(selection: desk.desk.query, markdown: "") : paper.editor.speech
    }

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

    /// The space above the keyboard, and the middle of the input bar.
    private var deskArea: (CGRect, CGFloat) {
        let screen = placement?.screen ?? NSScreen.main?.visibleFrame ?? .zero
        let floor = placement?.floor ?? screen.minY
        let margin = placement?.margin ?? 0
        let bottom = floor + margin
        let area = CGRect(
            x: screen.minX + margin, y: bottom, width: max(0, screen.width - 2 * margin),
            height: max(0, screen.maxY - margin - bottom))
        return (area, placement?.bar?.midX ?? screen.midX)
    }

    // MARK: - The desk

    private func perform(_ command: WriteDeskCommand) {
        let selected = desk.desk.selected
        switch command {
        case .open:
            open(selected)
        case .rename:
            open(selected)
            paper.editor.selectTitle()
        case .newDocument:
            open(.newDocument)
        case .back:
            if let current = model.current {
                open(.document(current))
            } else {
                open(selected)
            }
        case .duplicate:
            guard let url = selected.url, let copy = model.duplicate(url) else { return }
            desk.update(documents: model.documents, select: copy.url)
        case .reveal:
            guard let url = selected.url else { return }
            reveal(url)
        case .trash:
            guard case .document(let document) = selected else { return }
            model.moveToTrash(document.url)
            desk.update(documents: model.documents)
            if model.trashed != nil { desk.showUndo(title: document.title) }
        case .undo:
            guard let back = model.undoTrash() else { return }
            desk.hideUndo()
            desk.update(documents: model.documents, select: back.url)
        case .close:
            closeDesk()
        }
    }

    /// Opens a card on the paper. The paper grows out of the card, and the
    /// other cards go down into the bar.
    private func open(_ item: WriteDesk.Item) {
        let start = desk.cardFrame(of: item.url)
        switch item {
        case .newDocument: model.newDocument()
        case .document(let document): model.select(document.url)
        }
        model.forgetTrash()
        desk.hide(opening: item.url, newDocument: item == .newDocument)
        paper.reopen(from: start)
        onPanelChange?(panel)
        onCaretChange?(caret)
    }

    /// Closes Write from the desk.
    private func closeDesk() {
        save()
        model.forgetTrash()
        desk.hide()
        windowClosed(desk.window)
        onPanelChange?(panel)
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
