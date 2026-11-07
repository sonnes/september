import AppKit
import SeptemberKit

@MainActor
func writeControllerTests() {
    let now = Date(timeIntervalSince1970: 1_800_000_000)

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
}
