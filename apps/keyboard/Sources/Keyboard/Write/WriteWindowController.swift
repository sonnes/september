import AppKit
import Combine
import SeptemberKit
import SwiftUI

/// The Write window: a normal macOS window with the document list and the
/// Markdown editor. It takes focus, and the keyboard types into it the same
/// as into any other app.
///
/// Each document is a Markdown file in `~/Documents/September`. The page sends
/// the text 120 ms after the typing stops, and the model saves it then, so
/// the window has no Save command.
@MainActor
final class WriteWindowController: NSWindowController, NSWindowDelegate, NSToolbarDelegate {
    let model: WriteModel
    /// Called with `true` when the Write window becomes the key window, and
    /// with `false` when it stops being the key window. The app panel shows
    /// the Write panel (`WritePanel.id`) while it is key.
    var onKeyChanged: ((Bool) -> Void)?

    private let page = EditorWebPage()
    private var started = false
    private var titleSubscription: AnyCancellable?

    private static let newItem = NSToolbarItem.Identifier("september.write.new")

    init(library: DocumentLibrary = DocumentLibrary()) {
        model = WriteModel(library: library)
        let window = WriteWindow(
            contentRect: NSRect(origin: .zero, size: Metrics.writeWindowSize),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: true)
        super.init(window: window)

        window.isReleasedWhenClosed = false
        window.minSize = Metrics.writeWindowMinSize
        window.contentViewController = makeContent()
        window.delegate = self
        window.onNewDocument = { [weak self] in self?.newDocument() }
        window.center()
        window.setFrameAutosaveName("September Write")

        let toolbar = NSToolbar(identifier: "september.write")
        toolbar.delegate = self
        toolbar.displayMode = .iconAndLabel
        window.toolbar = toolbar
        window.toolbarStyle = .unified

        page.onMessage = { [weak self] message in self?.handle(message) }
        page.onReload = { [weak self] in self?.model.reopen() }
        model.send = { [weak page] call in page?.send(call) }
        titleSubscription = model.$current.sink { [weak window] document in
            window?.title = document?.title ?? "Write"
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    /// Opens the window, or brings it to the front. The first open lists the
    /// folder and shows the newest document.
    func show() {
        if !started {
            started = true
            page.send(.theme(.september))
            model.start()
        }
        NSApp.activate()
        showWindow(nil)
        window?.makeKeyAndOrderFront(nil)
        window?.makeFirstResponder(page.webView)
    }

    /// True while the Write window is the key window.
    var isKey: Bool { window?.isKeyWindow == true }

    /// Saves the text in the editor now. Call it before the app quits.
    func flush() async {
        if let text = await page.flush() { model.flushed(text) }
    }

    /// The paragraph at the caret, for the input bar and the predictions.
    /// The keyboard cannot read its own window through the accessibility API.
    func caret() async -> EditorCaret? {
        await page.caret()
    }

    @objc private func newDocument() {
        Task {
            await flush()
            model.newDocument()
            window?.makeFirstResponder(page.webView)
        }
    }

    private func handle(_ message: EditorMessage) {
        switch message {
        case .change(let path, let text):
            model.editorChanged(path: path, text: text)
        case .wikiLink(let title):
            model.openLink(title: title)
        case .webLink(let url):
            NSWorkspace.shared.open(url)
        case .ready, .unused:
            break
        }
    }

    private func makeContent() -> NSViewController {
        let split = NSSplitViewController()
        let sidebar = NSSplitViewItem(
            sidebarWithViewController: NSHostingController(rootView: WriteSidebar(model: model)))
        sidebar.minimumThickness = Metrics.writeSidebarMinWidth
        sidebar.maximumThickness = Metrics.writeSidebarMaxWidth
        sidebar.canCollapse = false

        let editor = NSViewController()
        editor.view = page.webView
        split.addSplitViewItem(sidebar)
        split.addSplitViewItem(NSSplitViewItem(viewController: editor))
        split.splitView.setPosition(Metrics.writeSidebarWidth, ofDividerAt: 0)
        return split
    }

    // MARK: NSWindowDelegate

    func windowDidBecomeKey(_ notification: Notification) {
        onKeyChanged?(true)
    }

    func windowDidResignKey(_ notification: Notification) {
        onKeyChanged?(false)
    }

    func windowWillClose(_ notification: Notification) {
        Task { await flush() }
    }

    // MARK: NSToolbarDelegate

    func toolbarDefaultItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        [.sidebarTrackingSeparator, .flexibleSpace, Self.newItem]
    }

    func toolbarAllowedItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        toolbarDefaultItemIdentifiers(toolbar)
    }

    func toolbar(
        _ toolbar: NSToolbar,
        itemForItemIdentifier identifier: NSToolbarItem.Identifier,
        willBeInsertedIntoToolbar flag: Bool
    ) -> NSToolbarItem? {
        guard identifier == Self.newItem else { return nil }
        let item = NSToolbarItem(itemIdentifier: identifier)
        item.label = "New"
        item.toolTip = "New Document"
        item.image = NSImage(systemSymbolName: "square.and.pencil", accessibilityDescription: "New Document")
        item.isBordered = true
        item.target = self
        item.action = #selector(newDocument)
        return item
    }
}

/// The window of Write. Keyboard has no menu bar of its own, so the window
/// answers Command-N and Command-W itself.
final class WriteWindow: NSWindow {
    var onNewDocument: (() -> Void)?

    override func performKeyEquivalent(with event: NSEvent) -> Bool {
        let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
        guard flags == .command else { return super.performKeyEquivalent(with: event) }
        switch event.charactersIgnoringModifiers?.lowercased() {
        case "n":
            onNewDocument?()
            return true
        case "w":
            performClose(nil)
            return true
        default:
            return super.performKeyEquivalent(with: event)
        }
    }
}
