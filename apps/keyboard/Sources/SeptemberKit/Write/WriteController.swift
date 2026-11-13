import AppKit
import Combine

/// The app around Write. Write calls it when a window of Write takes or
/// leaves the focus, and when the panel or the caret changes.
@MainActor
public protocol WriteHost: AnyObject {
    /// Brings the paper or the desk to the front with the focus. The keyboard
    /// does this in a way that also works after a press through `AXPress`.
    func bringToFront(_ window: NSWindow)
    /// The paper or the desk closed, so that its window does not wait for
    /// the focus.
    func windowClosed(_ window: NSWindow)
    /// True when the paper or the desk becomes the key window, and false when
    /// it stops being the key window.
    func writeKeyChanged(_ isKey: Bool)
    /// The desk opened or closed.
    func writePanelChanged(_ panel: WritePanel)
    /// The paragraph at the caret after each edit or caret move, or the Find
    /// query while the desk is open. The keyboard cannot read its own window
    /// through the accessibility API, so the input bar reads the editor here.
    func writeCaretMoved(_ caret: EditorCaret)
}

/// What the session reads from Write: the caret for the input bar, and the
/// text for Speak.
@MainActor
public protocol WriteReading: AnyObject {
    /// The paragraph at the caret, or the Find query on the desk.
    var caret: EditorCaret { get }
    /// The selection and the document for Speak, or the Find query on the desk.
    var speech: EditorSpeech { get }
}

/// Write: the paper with the native editor, and the desk with the documents
/// in the folder of Write.
///
/// The model saves the open document a short time after the last edit, and
/// before another document opens, so Write has no Save command. A link to
/// a document opens that document. A web link opens in the browser.
///
/// Command-O turns the paper into the desk: the paper shrinks into its card,
/// and the other documents rise out of the bar as cards. The open card grows
/// back into the paper.
@MainActor
public final class WriteController: WriteReading {
    public let model: WriteModel
    public let paper: WritePaperController
    public let desk: WriteDeskController
    private weak var host: (any WriteHost)?

    private let openURL: (URL) -> Void
    private let reveal: (URL) -> Void
    private var started = false
    private var failure: AnyCancellable?
    /// Where the paper opened last: the desk uses the same space.
    private var placement: (bar: CGRect?, floor: CGFloat, screen: CGRect, margin: CGFloat)?

    /// - Parameters:
    ///   - host: the app around Write. Write keeps a weak reference to it.
    ///   - openURL: opens a web or mail link.
    ///   - reveal: shows a file in Finder.
    ///   - scheduler: the clock of the delayed save.
    public init(
        host: any WriteHost,
        library: DocumentLibrary = DocumentLibrary(),
        openURL: @escaping (URL) -> Void = { NSWorkspace.shared.open($0) },
        reveal: @escaping (URL) -> Void = { NSWorkspace.shared.activateFileViewerSelecting([$0]) },
        scheduler: any DelayScheduler = MainQueueScheduler()
    ) {
        self.host = host
        paper = WritePaperController(host: host)
        model = WriteModel(library: library, editor: paper.editor, scheduler: scheduler)
        desk = WriteDeskController(host: host)
        self.openURL = openURL
        self.reveal = reveal

        let editor = paper.editor
        editor.onTextChange = { [weak model] in model?.edited() }
        editor.onCaretChange = { [weak self] caret in self?.host?.writeCaretMoved(caret) }
        editor.onOpenLink = { [weak self] link in self?.open(link) }
        paper.window.onNewDocument = { [weak self] in self?.newDocument() }
        paper.window.onShowDocuments = { [weak self] in self?.showDesk() }
        paper.onClose = { [weak self] in self?.save() }
        failure = model.$failure.sink { [weak paper, weak desk] text in
            paper?.showNotice(text)
            desk?.showNotice(text)
        }

        desk.preview = { [weak model] document in
            model?.preview(document, lines: WriteDesk.cardLines) ?? []
        }
        desk.onCommand = { [weak self] command in self?.perform(command) }
        desk.onQueryChange = { [weak self] _ in
            guard let self else { return }
            self.host?.writeCaretMoved(caret)
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
            host?.bringToFront(desk.window)
            return
        }
        if model.current == nil { model.start() }
        paper.show(from: bar, floor: floor, screen: screen, margin: margin)
    }

    public var isDeskOpen: Bool { desk.isOpen }

    public var panel: WritePanel { desk.isOpen ? .desk : .paper }

    /// Opens the desk. The open document saves first, and the paper shrinks
    /// into its card.
    public func showDesk() {
        guard !desk.isOpen else { return }
        start()
        save()
        let (area, centre) = deskArea
        desk.show(documents: model.documents, current: model.current?.url, area: area, centre: centre)
        paper.shrink(into: desk.cardFrame(of: model.current?.url))
        host?.writePanelChanged(panel)
    }

    /// Saves the open document now. Call it before the app quits.
    public func save() {
        model.save()
    }

    public var caret: EditorCaret {
        guard desk.isOpen else { return paper.editor.caret }
        let query = desk.desk.query
        return EditorCaret(text: query, caret: (query as NSString).length, length: 0)
    }

    public var speech: EditorSpeech {
        desk.isOpen ? EditorSpeech(selection: desk.desk.query, markdown: "") : paper.editor.speech
    }

    /// Starts a new document on the paper. The open document saves first.
    public func newDocument() {
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
        host?.writePanelChanged(panel)
        host?.writeCaretMoved(caret)
    }

    private func closeDesk() {
        save()
        model.forgetTrash()
        desk.hide()
        host?.windowClosed(desk.window)
        host?.writePanelChanged(panel)
    }

    private func open(_ link: WriteLink) {
        switch link {
        case .wiki(let target):
            model.openLink(title: target)
        case .url(let text):
            guard let url = URL(string: text),
                ["http", "https", "mailto"].contains(url.scheme?.lowercased() ?? "")
            else { return }
            openURL(url)
        }
    }
}

extension WriteTextView: WriteEditing {
    public func show(_ text: String) {
        if text.isEmpty { loadNewDocument() } else { load(text) }
    }

    public var text: String { markdown }
}
