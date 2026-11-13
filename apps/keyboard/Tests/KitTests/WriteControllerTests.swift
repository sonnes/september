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
        let write = WriteController(library: DocumentLibrary(folder: url))

        write.start()
        expectEqual(write.paper.editor.markdown, "# New")
        type(write.paper.editor, " Plans")
        write.save()
        expectEqual(write.model.current?.title, "New Plans")
        let saved = url.appendingPathComponent("New Plans.md")
        expectEqual(try String(contentsOf: saved, encoding: .utf8), "# New Plans")
    }

    test("a document link opens that document, and a web link goes to the browser") {
        let url = try folder(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        var opened: [URL] = []
        let write = WriteController(library: DocumentLibrary(folder: url), openURL: { opened.append($0) })
        write.start()

        write.paper.editor.onOpenLink?(.wiki(target: "Old"))
        expectEqual(write.model.current?.title, "Old")
        expectEqual(write.paper.editor.markdown, "# Old")

        write.paper.editor.onOpenLink?(.url("https://example.com"))
        expectEqual(opened, [URL(string: "https://example.com")!])
        write.paper.editor.onOpenLink?(.url("file:///etc/hosts"))
        expectEqual(opened.count, 1, "only web and mail links open")
    }

    test("Command-N starts a new document with an empty heading") {
        let url = try folder(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        let write = WriteController(library: DocumentLibrary(folder: url))
        write.start()

        write.paper.window.onNewDocument?()
        expectEqual(write.model.current?.url.lastPathComponent, "Untitled.md")
        type(write.paper.editor, "Garden")
        expectEqual(write.paper.editor.markdown, "# Garden")
    }

    test("Write reports the caret paragraph and the text for Speak") {
        let url = try folder([:])
        defer { try? FileManager.default.removeItem(at: url) }
        let write = WriteController(library: DocumentLibrary(folder: url))
        var carets: [EditorCaret] = []
        write.onCaretChange = { carets.append($0) }
        write.start()

        type(write.paper.editor, "Hi")
        expectEqual(carets.last, EditorCaret(text: "Hi", caret: 2, length: 0))
        expectEqual(write.caret, EditorCaret(text: "Hi", caret: 2, length: 0))
        expectEqual(write.speech.text, "Hi.")
    }

    // MARK: The desk

    /// Write with the folder, a Trash folder, and no activation of the app.
    func deskWrite(_ files: [String: String], revealed: ((URL) -> Void)? = nil) throws -> (WriteController, URL) {
        let url = try folder(files)
        let trash = url.appendingPathComponent(".Trash", isDirectory: true)
        try FileManager.default.createDirectory(at: trash, withIntermediateDirectories: true)
        let write = WriteController(
            library: DocumentLibrary(folder: url, trash: .folder(trash)), reveal: revealed ?? { _ in })
        write.bringToFront = { _ in }
        write.start()
        return (write, url)
    }

    test("Command-O opens the desk on the open document, and the Write panel turns to Documents") {
        let (write, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        var panels: [WritePanel] = []
        write.onPanelChange = { panels.append($0) }
        expectEqual(write.panel, .paper)

        write.paper.window.onShowDocuments?()
        expect(write.isDeskOpen, "the desk is open")
        expectEqual(write.desk.desk.selected, .document(write.model.documents[0]))
        expectEqual(write.panel, .desk)
        expectEqual(panels, [.desk])
    }

    test("Return on a card opens its document on the paper") {
        let (write, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        var panels: [WritePanel] = []
        write.onPanelChange = { panels.append($0) }
        write.showDesk()

        write.desk.move(by: 1)
        write.desk.onCommand?(.open)
        expect(!write.isDeskOpen, "the desk closes")
        expectEqual(write.model.current?.title, "Old")
        expectEqual(write.paper.editor.markdown, "# Old")
        expectEqual(panels, [.desk, .paper])
    }

    test("the New Document card and Command-N on the desk start a new document") {
        let (write, url) = try deskWrite(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.onCommand?(.newDocument)
        expectEqual(write.model.current?.url.lastPathComponent, "Untitled.md")
        expect(!write.isDeskOpen, "the desk closes")
    }

    test("the Find query goes to the input bar, and it picks the card") {
        let (write, url) = try deskWrite(["New.md": "# New", "Garden Plans.md": "# Garden Plans"])
        defer { try? FileManager.default.removeItem(at: url) }
        var carets: [EditorCaret] = []
        write.onCaretChange = { carets.append($0) }
        write.showDesk()
        expectEqual(carets.last, EditorCaret(text: "", caret: 0, length: 0))

        write.desk.setQuery("gar")
        expectEqual(carets.last, EditorCaret(text: "gar", caret: 3, length: 0))
        expectEqual(write.caret, EditorCaret(text: "gar", caret: 3, length: 0))
        expectEqual(write.desk.desk.selected.url?.lastPathComponent, "Garden Plans.md")
    }

    test("Move to Trash takes the card away and offers Undo, and Undo brings it back") {
        let (write, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
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
        let (write, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()

        write.desk.onCommand?(.trash)
        expectEqual(write.model.current, nil)
        write.desk.onCommand?(.back)
        expectEqual(write.model.current?.title, "Old")
        expectEqual(write.paper.editor.markdown, "# Old")
    }

    test("Esc goes back to the open document") {
        let (write, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.move(by: 1)
        write.desk.onCommand?(.back)
        expect(!write.isDeskOpen, "the desk closes")
        expectEqual(write.model.current?.title, "New")
    }

    test("Rename opens the document with its heading selected") {
        let (write, url) = try deskWrite(["New.md": "# New", "Old.md": "# Old"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.move(by: 1)
        write.desk.onCommand?(.rename)
        expectEqual(write.model.current?.title, "Old")
        expectEqual(write.paper.editor.selectedRange(), NSRange(location: 0, length: 3))
    }

    test("Duplicate puts the copy first on the desk and selects it") {
        let (write, url) = try deskWrite(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.onCommand?(.duplicate)
        expectEqual(write.desk.desk.documents.map(\.title), ["New 2", "New"])
        expectEqual(write.desk.desk.selected.url?.lastPathComponent, "New 2.md")
    }

    test("Show in Finder shows the file of the selected card") {
        var revealed: [URL] = []
        let (write, url) = try deskWrite(["New.md": "# New"], revealed: { revealed.append($0) })
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.onCommand?(.reveal)
        expectEqual(revealed.map(\.lastPathComponent), ["New.md"])
    }

    test("Command-W on the desk saves and closes Write") {
        let (write, url) = try deskWrite(["New.md": "# New"])
        defer { try? FileManager.default.removeItem(at: url) }
        write.showDesk()
        write.desk.onCommand?(.close)
        expect(!write.isDeskOpen, "the desk closes")
        expectEqual(write.panel, .paper)
    }
}
