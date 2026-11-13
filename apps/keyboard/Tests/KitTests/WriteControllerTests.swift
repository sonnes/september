import AppKit
import SeptemberKit

@MainActor
func writeControllerTests() {
    let now = Date()

    func folder(_ files: [String: String]) throws -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("september-write-controller-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        for (offset, (name, text)) in files.sorted(by: { $0.key < $1.key }).enumerated() {
            let file = url.appendingPathComponent(name)
            try Data(text.utf8).write(to: file)
            try FileManager.default.setAttributes(
                [.modificationDate: now - TimeInterval(offset * 100)], ofItemAtPath: file.path)
        }
        return url
    }
    func type(_ view: WriteTextView, _ text: String) {
        for char in text {
            view.insertText(String(char), replacementRange: NSRange(location: NSNotFound, length: 0))
        }
    }

    test("Write shows the newest document on the paper, and saves the edits") {
        let url = try folder(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        let host = RecordingWriteHost()
        let write = WriteController(host: host, library: DocumentLibrary(folder: url))

        write.start()
        expectEqual(write.paper.editor.markdown, "# New")
        type(write.paper.editor, " Plans")
        write.save()
        expectEqual(write.model.current?.title, "New Plans")
        let saved = url.appendingPathComponent("New Plans.md")
        expectEqual(try String(contentsOf: saved, encoding: .utf8), "# New Plans")
    }

    test("typing saves the document after the save delay") {
        let url = try folder(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        let clock = FakeClock()
        let write = WriteController(host: RecordingWriteHost(), library: DocumentLibrary(folder: url), scheduler: clock)
        write.start()

        type(write.paper.editor, " Plans")
        expectEqual(write.model.current?.title, "New")
        clock.advance(to: WriteModel.saveDelay)
        expectEqual(write.model.current?.title, "New Plans")
        let saved = url.appendingPathComponent("New Plans.md")
        expectEqual(try String(contentsOf: saved, encoding: .utf8), "# New Plans")
    }

    test("opening a document does not save it") {
        let url = try folder(["draft.md": "# Garden\n\nTulips."])
        defer { try? FileManager.default.removeItem(at: url) }
        let clock = FakeClock()
        let write = WriteController(host: RecordingWriteHost(), library: DocumentLibrary(folder: url), scheduler: clock)

        write.start()
        clock.advance(to: WriteModel.saveDelay * 2)
        write.save()
        expectEqual(write.model.documents.map(\.url.lastPathComponent), ["draft.md"])
    }

    test("a document link opens that document, and a web link goes to the browser") {
        let url = try folder(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        var opened: [URL] = []
        let host = RecordingWriteHost()
        let write = WriteController(
            host: host, library: DocumentLibrary(folder: url), openURL: { opened.append($0) })
        write.start()

        write.paper.editor.onOpenLink?(.wiki(target: "Old"))
        expectEqual(write.model.current?.title, "Old")
        expectEqual(write.paper.editor.markdown, "# Old")

        write.paper.editor.onOpenLink?(.url("https://example.com"))
        expectEqual(opened, [URL(string: "https://example.com")!])
        write.paper.editor.onOpenLink?(.url("file:///etc/hosts"))
        expectEqual(opened.count, 1, "only web and mail links open")
    }

    test("a new document starts with an empty heading") {
        let url = try folder(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        let host = RecordingWriteHost()
        let write = WriteController(host: host, library: DocumentLibrary(folder: url))
        write.start()

        write.newDocument()
        expectEqual(write.model.current?.url.lastPathComponent, "Untitled.md")
        type(write.paper.editor, "Garden")
        expectEqual(write.paper.editor.markdown, "# Garden")
    }

    test("Write reports the caret paragraph and the text for Speak") {
        let url = try folder([:])
        defer { try? FileManager.default.removeItem(at: url) }
        let host = RecordingWriteHost()
        let write = WriteController(host: host, library: DocumentLibrary(folder: url))
        write.start()

        type(write.paper.editor, "Hi")
        expectEqual(host.carets.last, EditorCaret(text: "Hi", caret: 2, length: 0))
        expectEqual(write.caret, EditorCaret(text: "Hi", caret: 2, length: 0))
        expectEqual(write.speech.text, "Hi.")
    }

    // MARK: The desk

    func deskWrite(
        _ files: [String: String], revealed: ((URL) -> Void)? = nil
    ) throws -> (WriteController, RecordingWriteHost, URL) {
        let url = try folder(files)
        let trash = url.appendingPathComponent(".Trash", isDirectory: true)
        try FileManager.default.createDirectory(at: trash, withIntermediateDirectories: true)
        let host = RecordingWriteHost()
        let write = WriteController(
            host: host, library: DocumentLibrary(folder: url, trash: .folder(trash)), reveal: revealed ?? { _ in })
        write.start()
        return (write, host, url)
    }

    test("the desk opens on the open document, and the Write panel turns to Documents") {
        let (write, host, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        expectEqual(write.panel, .paper)

        write.showDesk()
        expect(write.isDeskOpen, "the desk is open")
        expectEqual(write.desk.desk.selected, .document(write.model.documents[0]))
        expectEqual(write.panel, .desk)
        expectEqual(host.panels, [.desk])
        expectEqual(host.broughtToFront, [write.desk.window])
    }

    test("Return on a card opens its document on the paper") {
        let (write, host, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()

        write.desk.move(by: 1)
        write.desk.onCommand?(.open)
        expect(!write.isDeskOpen, "the desk closes")
        expectEqual(write.model.current?.title, "Old")
        expectEqual(write.paper.editor.markdown, "# Old")
        expectEqual(host.panels, [.desk, .paper])
    }

    test("the New Document card and Command-N on the desk start a new document") {
        let (write, _, url) = try deskWrite(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.onCommand?(.newDocument)
        expectEqual(write.model.current?.url.lastPathComponent, "Untitled.md")
        expect(!write.isDeskOpen, "the desk closes")
    }

    test("the Find query goes to the input bar, and it picks the card") {
        let (write, host, url) = try deskWrite(["New.md": "# New", "Garden Plans.md": "# Garden Plans"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        expectEqual(host.carets.last, EditorCaret(text: "", caret: 0, length: 0))

        write.desk.setQuery("gar")
        expectEqual(host.carets.last, EditorCaret(text: "gar", caret: 3, length: 0))
        expectEqual(write.caret, EditorCaret(text: "gar", caret: 3, length: 0))
        expectEqual(write.desk.desk.selected.url?.lastPathComponent, "Garden Plans.md")
    }

    test("Move to Trash takes the card away and offers Undo, and Undo brings it back") {
        let (write, _, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.move(by: 1)

        write.desk.onCommand?(.trash)
        expectEqual(write.desk.desk.documents.map(\.title), ["New"])
        expectEqual(write.desk.undoTitle, "Old")
        expectEqual(write.model.current?.title, "New")

        write.desk.onCommand?(.undo)
        expectEqual(write.desk.desk.documents.map(\.title), ["New", "Old"])
        expectEqual(write.desk.desk.selected.url?.lastPathComponent, "Old.md")
        expectEqual(write.desk.undoTitle, nil)
    }

    test("after the open document goes to the Trash, Esc opens the selected card") {
        let (write, _, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()

        write.desk.onCommand?(.trash)
        expectEqual(write.model.current, nil)
        write.desk.onCommand?(.back)
        expectEqual(write.model.current?.title, "Old")
        expectEqual(write.paper.editor.markdown, "# Old")
    }

    test("Esc goes back to the open document") {
        let (write, _, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.move(by: 1)
        write.desk.onCommand?(.back)
        expect(!write.isDeskOpen, "the desk closes")
        expectEqual(write.model.current?.title, "New")
    }

    test("Rename opens the document with its heading selected") {
        let (write, _, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.move(by: 1)
        write.desk.onCommand?(.rename)
        expectEqual(write.model.current?.title, "Old")
        expectEqual(write.paper.editor.selectedRange(), NSRange(location: 0, length: 3))
    }

    test("Duplicate puts the copy first on the desk and selects it") {
        let (write, _, url) = try deskWrite(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.onCommand?(.duplicate)
        expectEqual(write.desk.desk.documents.map(\.title), ["New 2", "New"])
        expectEqual(write.desk.desk.selected.url?.lastPathComponent, "New 2.md")
    }

    test("Show in Finder shows the file of the selected card") {
        var revealed: [URL] = []
        let (write, _, url) = try deskWrite(["New.md": "# New"], revealed: { revealed.append($0) })
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.onCommand?(.reveal)
        expectEqual(revealed.map(\.lastPathComponent), ["New.md"])
    }

    test("Command-W on the desk saves and closes Write") {
        let (write, host, url) = try deskWrite(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.onCommand?(.close)
        expect(!write.isDeskOpen, "the desk closes")
        expectEqual(write.panel, .paper)
        expectEqual(host.closed, [write.desk.window])
    }

    test("an error of the folder shows on the desk") {
        let (write, _, url) = try deskWrite(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        expectEqual(write.desk.failure, nil)

        try FileManager.default.removeItem(at: url)
        try Data().write(to: url)
        write.desk.onCommand?(.duplicate)
        expect(write.desk.failure != nil, "the desk shows the error")
        expectEqual(write.desk.failure, write.model.failure)
    }

    test("a card whose file cannot be read shows the error on the desk") {
        let (write, _, url) = try deskWrite(["New.md": "# New", "Locked.md": "# Locked"])
        defer { try? FileManager.default.removeItem(at: url) }
        let locked = url.appendingPathComponent("Locked.md")
        try FileManager.default.setAttributes([.posixPermissions: 0], ofItemAtPath: locked.path)
        defer { try? FileManager.default.setAttributes([.posixPermissions: 0o644], ofItemAtPath: locked.path) }

        write.showDesk()
        expect(write.model.failure != nil, "the model keeps the error")
        expectEqual(write.desk.failure, write.model.failure)
    }

    test("each shortcut of the Write panel reaches the paper") {
        let (write, _, url) = try deskWrite(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        for button in try PanelStore.bundled().write.buttons {
            guard case .shortcut = button.action else { continue }
            write.paper.window.makeFirstResponder(write.paper.editor)
            let event = try keyEvent(of: button.action)
            expect(write.paper.window.performKeyEquivalent(with: event), "\(button.id)")
        }
    }

    // A key with no Command goes through the key bindings of the Find field.
    // These need an active input context, which a window that is not key
    // does not have, so only the Command shortcuts are sent here.
    test("each Command shortcut of the Documents panel reaches the desk") {
        let (write, _, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        for button in try PanelStore.bundled().writeDocuments.buttons {
            guard case .shortcut(let shortcut) = button.action, shortcut.modifiers.contains(.command) else { continue }
            write.showDesk()
            let event = try keyEvent(of: button.action)
            expect(write.desk.window.performKeyEquivalent(with: event), "\(button.id)")
        }
    }

    test("New Document saves the open document and starts an empty one") {
        let (write, _, url) = try deskWrite(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        type(write.paper.editor, " Plans")
        write.newDocument()
        expectEqual(write.model.current?.url.lastPathComponent, "Untitled.md")
        expectEqual(write.model.documents.map(\.title).sorted(), ["New Plans", "Untitled"])
    }
}

@MainActor
private final class RecordingWriteHost: WriteHost {
    private(set) var broughtToFront: [NSWindow] = []
    private(set) var closed: [NSWindow] = []
    private(set) var keyChanges: [Bool] = []
    private(set) var panels: [WritePanel] = []
    private(set) var carets: [EditorCaret] = []

    func bringToFront(_ window: NSWindow) { broughtToFront.append(window) }
    func windowClosed(_ window: NSWindow) { closed.append(window) }
    func writeKeyChanged(_ isKey: Bool) { keyChanges.append(isKey) }
    func writePanelChanged(_ panel: WritePanel) { panels.append(panel) }
    func writeCaretMoved(_ caret: EditorCaret) { carets.append(caret) }
}

/// The key event of the main key that a press of `action` posts, as the app
/// in front gets it on the current keyboard layout.
@MainActor
private func keyEvent(of action: PanelAction) throws -> NSEvent {
    let sink = RecordingSink()
    let controller = KeyboardController(
        sink: sink, panels: try PanelStore.bundled(), accents: try AccentTable.bundled("en"),
        keyCodeMap: SystemKeyboardLayout.currentMap(), privateTexts: MemoryPrivateTexts(),
        talk: TalkSession(said: SaidList(database: memoryDatabase())))
    controller.perform(action)
    guard let key = sink.downs.last,
        let event = CGEvent(keyboardEventSource: nil, virtualKey: key.key, keyDown: true)
    else { throw NoKeyEvent() }
    event.flags = key.flags.eventFlags
    guard let keyEvent = NSEvent(cgEvent: event) else { throw NoKeyEvent() }
    return keyEvent
}

private struct NoKeyEvent: Error {}
