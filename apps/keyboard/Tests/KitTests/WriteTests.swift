import Foundation
import SeptemberKit

/// A new empty folder in the temporary directory. The tests never touch
/// `~/Documents`.
private func makeFolder() -> URL {
    FileManager.default.temporaryDirectory
        .appendingPathComponent("september-write-tests-\(UUID().uuidString)", isDirectory: true)
}

private func write(_ text: String, to folder: URL, name: String, modified: Date) throws -> URL {
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let url = folder.appendingPathComponent(name)
    try Data(text.utf8).write(to: url)
    try FileManager.default.setAttributes([.modificationDate: modified], ofItemAtPath: url.path)
    return url
}

private func names(_ documents: [WriteDocument]) -> [String] {
    documents.map(\.url.lastPathComponent)
}

/// Collects the calls that the model sends to the editor page.
@MainActor
private final class CallLog {
    var calls: [EditorCall] = []

    var opens: [EditorOpenRequest] {
        calls.compactMap { if case .open(let request) = $0 { request } else { nil } }
    }

    var headers: [String] {
        calls.compactMap { if case .header(let header, _) = $0 { header } else { nil } }
    }
}

@MainActor
private func makeModel(_ folder: URL) -> (WriteModel, CallLog) {
    let log = CallLog()
    let model = WriteModel(library: DocumentLibrary(folder: folder))
    model.send = { log.calls.append($0) }
    return (model, log)
}

@MainActor
func writeTests() {
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    // MARK: DocumentLibrary

    test("the library lists the Markdown files, newest first") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        _ = try write("a", to: folder, name: "Garden Plans.md", modified: now - 86_400)
        _ = try write("b", to: folder, name: "Questions.md", modified: now)
        _ = try write("c", to: folder, name: "Recipes.md", modified: now - 900_000)
        _ = try write("d", to: folder, name: "photo.png", modified: now)

        let documents = try DocumentLibrary(folder: folder).documents()
        expectEqual(names(documents), ["Questions.md", "Garden Plans.md", "Recipes.md"])
        expectEqual(documents.first?.title, "Questions")
    }

    test("a missing folder lists no documents") {
        let folder = makeFolder()
        expectEqual(try DocumentLibrary(folder: folder).documents().count, 0)
    }

    test("the default folder is September in Documents") {
        expectEqual(DocumentLibrary.defaultFolder.lastPathComponent, "September")
        expectEqual(DocumentLibrary.defaultFolder.deletingLastPathComponent().lastPathComponent, "Documents")
    }

    test("a new document is an empty Untitled file, with a number when the name is taken") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let library = DocumentLibrary(folder: folder)

        let first = try library.create()
        let second = try library.create()
        expectEqual(first.url.lastPathComponent, "Untitled.md")
        expectEqual(second.url.lastPathComponent, "Untitled 2.md")
        expectEqual(try library.read(first), "")
    }

    test("the title is the first heading") {
        expectEqual(DocumentLibrary.title(of: "# Questions for the Clinic\n\nAsk."), "Questions for the Clinic")
        expectEqual(DocumentLibrary.title(of: "Intro line\n\n## Garden Plans  \n"), "Garden Plans")
        expectEqual(DocumentLibrary.title(of: "#hashtag\n- a list"), nil)
        expectEqual(DocumentLibrary.title(of: "# \n"), nil)
        expectEqual(DocumentLibrary.title(of: "#   Letter: to the / Council ##"), "Letter- to the - Council")
    }

    test("a save writes the text and names the file after its first heading") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let library = DocumentLibrary(folder: folder)
        let document = try library.create()

        let saved = try library.save("# Garden Plans\n\nTulips.", to: document.url)
        expectEqual(saved.lastPathComponent, "Garden Plans.md")
        expectEqual(try String(contentsOf: saved, encoding: .utf8), "# Garden Plans\n\nTulips.")
        expect(!FileManager.default.fileExists(atPath: document.url.path), "the old name is gone")
    }

    test("a save keeps the name when the text has no heading or the same heading") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let library = DocumentLibrary(folder: folder)
        let document = try library.create()

        expectEqual(try library.save("no heading", to: document.url).lastPathComponent, "Untitled.md")
        let named = try library.save("# Plans", to: document.url)
        expectEqual(try library.save("# Plans\n\nmore", to: named).lastPathComponent, "Plans.md")
    }

    test("a save of the same text leaves the file and its date alone") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let url = try write("# Plans\n", to: folder, name: "Plans.md", modified: now)
        let library = DocumentLibrary(folder: folder)

        expectEqual(try library.save("# Plans\n", to: url), url)
        expectEqual(try library.documents().first?.modified, now)
    }

    test("a save never takes the name of another file") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let library = DocumentLibrary(folder: folder)
        _ = try write("# Plans", to: folder, name: "Plans.md", modified: now)
        let document = try library.create()

        let saved = try library.save("# Plans\n\nanother", to: document.url)
        expectEqual(saved.lastPathComponent, "Plans 2.md")
        expectEqual(try String(contentsOf: folder.appendingPathComponent("Plans.md"), encoding: .utf8), "# Plans")
        // The numbered name stays while the heading stays the same.
        expectEqual(try library.save("# Plans\n\nedit", to: saved).lastPathComponent, "Plans 2.md")
    }

    // MARK: Dates in the list

    test("the list shows Now, the time, Yesterday, or the day and month") {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let locale = Locale(identifier: "en_GB")
        let reference = Date(timeIntervalSince1970: 1_762_430_400)  // 6 Nov 2025, 12:00 UTC
        func label(_ offset: TimeInterval) -> String {
            WriteDocument.dateLabel(reference + offset, now: reference, calendar: calendar, locale: locale)
        }
        expectEqual(label(-20), "Now")
        expectEqual(label(-3 * 3_600), "09:00")
        expectEqual(label(-86_400), "Yesterday")
        expectEqual(label(-3 * 86_400), "3 Nov")
    }

    // MARK: The bridge

    test("a call is a script on window.piper with JSON arguments") {
        expectEqual(EditorCall.replace("a \"b\"\n").script, #"window.piper.replace("a \"b\"\n")"#)
        expectEqual(EditorCall.command("find").script, #"window.piper.command("find")"#)
        expectEqual(EditorCall.header("Saved", nil).script, #"window.piper.header("Saved",null)"#)
        expectEqual(EditorCall.flushScript, "window.piper.flush()")

        let open = EditorCall.open(
            EditorOpenRequest(path: "write-1", text: "# Hi", header: "Now", wikiTargets: [])
        ).script
        expect(open.hasPrefix("window.piper.open({"), open)
        for part in [#""path":"write-1""#, ##""text":"# Hi""##, #""editable":true"#, #""mode":"rich""#,
                     #""title":null"#, #""anchor":null"#, #""wikiTargets":[]"#] {
            expect(open.contains(part), "open has \(part)")
        }

        let theme = EditorCall.theme(.september).script
        for part in [#""theme":"Paper""#, #""font":"Sans Serif""#, #""appearance":"System""#] {
            expect(theme.contains(part), "theme has \(part)")
        }
    }

    test("the page messages decode, and the others answer nothing") {
        expectEqual(EditorMessage(body: ["action": "ready"]), .ready)
        expectEqual(
            EditorMessage(body: ["action": "change", "path": "write-1", "text": "Hi"]),
            .change(path: "write-1", text: "Hi"))
        expectEqual(
            EditorMessage(body: ["action": "link", "kind": "wiki", "target": "Plans"]),
            .wikiLink("Plans"))
        expectEqual(
            EditorMessage(body: ["action": "link", "kind": "url", "target": "https://example.com"]),
            .webLink(URL(string: "https://example.com")!))
        expectEqual(EditorMessage(body: ["action": "link", "kind": "url", "target": "file:///etc"]), .unused)
        expectEqual(EditorMessage(body: ["action": "change", "path": "write-1"]), .unused)
        for action in ["image", "lossy", "copy", "note", "ask", "explain", "capture"] {
            expectEqual(EditorMessage(body: ["action": action]), .unused)
        }
        expectEqual(EditorMessage(body: "not a dictionary"), .unused)
    }

    test("the caret paragraph of the page becomes the focused field of the input bar") {
        expect(EditorCall.caretScript.contains("getSelection"), "the script reads the selection")
        let caret = try JSONDecoder().decode(
            EditorCaret.self, from: Data(#"{"text":"Who checks it at ni","caret":19,"length":0}"#.utf8))
        let field = caret.focusedField
        expectEqual(field.appName, "Write")
        expectEqual(field.role, "AXTextArea")
        expect(field.isEditable && !field.isSecure, "an editable text field")
        expectEqual(field.display, .mirrored(text: "Who checks it at ni", caret: 19, selectionLength: 0))
        expect(!caret.documentIsEmpty, "a page that does not say tells of a document with text")
    }

    test("the caret read tells when the document has no text") {
        expect(EditorCall.caretScript.contains("empty"), "the script reads the whole editor")
        let caret = try JSONDecoder().decode(
            EditorCaret.self, from: Data(#"{"text":"","caret":0,"length":0,"empty":true}"#.utf8))
        expect(caret.documentIsEmpty)
    }

    // MARK: Speak

    test("Speak reads a heading without its marks, as a sentence") {
        expectEqual(MarkdownSpeech.plainText("# Garden plans"), "Garden plans.")
        expectEqual(MarkdownSpeech.plainText("### Is it warm? ###"), "Is it warm?")
        expectEqual(MarkdownSpeech.plainText("#hashtag"), "#hashtag", "a word after # is no heading")
    }

    test("Speak reads list items, numbers, and quotes without their marks") {
        expectEqual(MarkdownSpeech.plainText("- Roses\n* Tulips\n  + Lilies"), "Roses\nTulips\nLilies")
        expectEqual(MarkdownSpeech.plainText("1. Water\n2) Feed"), "1. Water\n2) Feed")
        expectEqual(MarkdownSpeech.plainText("> Said the gardener"), "Said the gardener")
    }

    test("Speak reads to-dos without their boxes") {
        expectEqual(MarkdownSpeech.plainText("- [ ] Buy seeds\n- [x] Dig the bed"), "Buy seeds\nDig the bed")
    }

    test("Speak reads bold, italic, struck, and marked words without their marks") {
        expectEqual(MarkdownSpeech.plainText("A **big** and __bold__ plan"), "A big and bold plan")
        expectEqual(MarkdownSpeech.plainText("An *odd* and _new_ idea"), "An odd and new idea")
        expectEqual(MarkdownSpeech.plainText("***Both*** ~~gone~~ ==marked=="), "Both gone marked")
        expectEqual(MarkdownSpeech.plainText("snake_case_name and 2 * 3 * 4"), "snake_case_name and 2 * 3 * 4")
    }

    test("Speak reads the text of links, images, and document links") {
        expectEqual(MarkdownSpeech.plainText("See [the plan](https://example.com) now"), "See the plan now")
        expectEqual(MarkdownSpeech.plainText("![A red rose](rose.png)"), "A red rose")
        expectEqual(MarkdownSpeech.plainText("Read [[Garden Plans]] and [[Recipes|the recipes]]"),
            "Read Garden Plans and the recipes")
        expectEqual(MarkdownSpeech.plainText("Mail <https://example.com>"), "Mail https://example.com")
        expectEqual(MarkdownSpeech.plainText("A note[^1] here"), "A note here")
    }

    test("Speak reads code without its marks") {
        expectEqual(MarkdownSpeech.plainText("Run `make test` first"), "Run make test first")
        expectEqual(MarkdownSpeech.plainText("```swift\nlet a = 1\n```"), "let a = 1")
        expectEqual(MarkdownSpeech.plainText("~~~\n# not a heading\n~~~"), "# not a heading")
    }

    test("Speak skips rules and table lines, and keeps escaped marks") {
        expectEqual(MarkdownSpeech.plainText("Above\n\n---\n\nBelow"), "Above\n\nBelow")
        expectEqual(MarkdownSpeech.plainText("| Day | Plant |\n| --- | :---: |\n| Mon | Roses |"),
            "Day, Plant\nMon, Roses")
        expectEqual(MarkdownSpeech.plainText(#"Price \*not\* bold"#), "Price *not* bold")
    }

    test("Speak in Write reads the selection, or the whole document") {
        let selected = EditorSpeech(selection: "the roses", markdown: "# Plan\n\nSee **the roses**.")
        expectEqual(selected.text, "the roses")
        let whole = EditorSpeech(selection: "", markdown: "# Plan\n\nSee **the roses**.")
        expectEqual(whole.text, "Plan.\n\nSee the roses.")
        expect(EditorSpeech(selection: " ", markdown: "---\n").text == nil, "nothing to read")
        expect(EditorCall.speechScript.contains("window.piper.flush()"), "the script reads the document")
        let decoded = try JSONDecoder().decode(
            EditorSpeech.self, from: Data(##"{"selection":"","markdown":"# Hi"}"##.utf8))
        expectEqual(decoded.text, "Hi.")
    }

    // MARK: WriteModel

    test("start opens the newest document in the editor") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        _ = try write("# Old", to: folder, name: "Old.md", modified: now - 100)
        _ = try write("# New", to: folder, name: "New.md", modified: now)
        let (model, log) = makeModel(folder)

        model.start()
        expectEqual(model.current?.title, "New")
        expectEqual(model.documents.count, 2)
        expectEqual(log.opens.count, 1)
        expectEqual(log.opens.first?.text, "# New")
        expectEqual(log.opens.first?.wikiTargets.map(\.target), ["New", "Old"])
    }

    test("start in an empty folder makes a new document") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let (model, log) = makeModel(folder)

        model.start()
        expectEqual(model.current?.url.lastPathComponent, "Untitled.md")
        expectEqual(log.opens.first?.text, "")
    }

    test("a change saves the open document and renames it from its heading") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let (model, log) = makeModel(folder)
        model.start()
        let path = try unwrap(log.opens.last?.path)

        model.editorChanged(path: path, text: "# Questions for the Clinic\n\nAsk.")
        expectEqual(model.current?.title, "Questions for the Clinic")
        expectEqual(names(model.documents), ["Questions for the Clinic.md"])
        expectEqual(log.headers.last, "Saved")

        model.editorChanged(path: path, text: "# Questions for the Clinic\n\nAsk on Friday.")
        let saved = folder.appendingPathComponent("Questions for the Clinic.md")
        expectEqual(try String(contentsOf: saved, encoding: .utf8), "# Questions for the Clinic\n\nAsk on Friday.")
    }

    test("a late change of the last document saves to that document") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let first = try write("# First", to: folder, name: "First.md", modified: now)
        let (model, log) = makeModel(folder)
        model.start()
        let firstPath = try unwrap(log.opens.last?.path)

        model.newDocument()
        expectEqual(model.current?.url.lastPathComponent, "Untitled.md")
        expect(log.opens.last?.path != firstPath, "each open has its own path")

        model.editorChanged(path: firstPath, text: "# First\n\nlast words")
        expectEqual(try String(contentsOf: first, encoding: .utf8), "# First\n\nlast words")
        expectEqual(model.current?.url.lastPathComponent, "Untitled.md")
        expectEqual(log.headers.last, nil, "a save of another document does not change the byline")
    }

    test("an unknown path saves nothing") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let (model, _) = makeModel(folder)
        model.start()
        model.editorChanged(path: "elsewhere", text: "# Lost")
        expectEqual(names(model.documents), ["Untitled.md"])
    }

    test("a flush saves the text of the open document") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let (model, _) = makeModel(folder)
        model.start()

        model.flushed("# Kept\n\nthe last keys")
        let kept = folder.appendingPathComponent("Kept.md")
        expectEqual(try String(contentsOf: kept, encoding: .utf8), "# Kept\n\nthe last keys")
        expectEqual(model.current?.title, "Kept")
    }

    test("reopen shows the open document again, with a new path") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let (model, log) = makeModel(folder)
        model.start()
        let first = try unwrap(log.opens.last)

        model.reopen()
        expectEqual(log.opens.count, 2)
        expect(log.opens.last?.path != first.path, "a new path")
        expectEqual(model.current?.url.lastPathComponent, "Untitled.md")
    }

    test("select opens a document once, and a wiki link opens it by title") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let plans = try write("# Plans", to: folder, name: "Plans.md", modified: now - 100)
        _ = try write("# Notes", to: folder, name: "Notes.md", modified: now)
        let (model, log) = makeModel(folder)
        model.start()

        model.select(plans)
        model.select(plans)
        expectEqual(model.current?.title, "Plans")
        expectEqual(log.opens.count, 2)

        model.openLink(title: "Notes")
        expectEqual(model.current?.title, "Notes")
        model.openLink(title: "Missing")
        expectEqual(model.current?.title, "Notes")
    }

    // MARK: The Write panel

    test("the Write panel has the Markdown keys and the editor shortcuts") {
        let panel = try PanelStore.bundled().appPanel(forBundleID: WritePanel.id)
        expectEqual(
            panel.buttons.map(\.id),
            ["heading", "list", "todo", "quote", "blocks", "link-document",
             "bold", "italic", "link", "new-document", "undo", "redo"])

        let actions = Dictionary(uniqueKeysWithValues: panel.buttons.map { ($0.id, $0.action) })
        expectEqual(actions["heading"], .text("# "))
        expectEqual(actions["todo"], .text("[ ] "))
        expectEqual(actions["blocks"], .text("/"))
        expectEqual(actions["link-document"], .text("[["))
        expectEqual(actions["bold"], .shortcut(Shortcut(modifiers: .command, key: .character("b"))))
        expectEqual(
            actions["redo"], .shortcut(Shortcut(modifiers: [.command, .shift], key: .character("z"))))
    }
}

private struct Missing: Error {}

private func unwrap<T>(_ value: T?) throws -> T {
    guard let value else { throw Missing() }
    return value
}
