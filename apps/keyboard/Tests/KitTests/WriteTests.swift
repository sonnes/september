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

/// Stands in for the editor: it keeps the text that the model shows, and
/// counts the reads of its text, one for each save.
@MainActor
private final class EditorStub {
    var shown: [String] = []
    var text = ""
    var reads = 0
}

@MainActor
private func makeModel(_ folder: URL, clock: FakeClock = FakeClock()) -> (WriteModel, EditorStub) {
    let editor = EditorStub()
    let model = WriteModel(library: DocumentLibrary(folder: folder), scheduler: clock)
    model.show = { text in
        editor.shown.append(text)
        editor.text = text
    }
    model.editorText = {
        editor.reads += 1
        return editor.text
    }
    return (model, editor)
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
    }

    // MARK: WriteModel

    test("start shows the newest document in the editor") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        _ = try write("# Old", to: folder, name: "Old.md", modified: now - 100)
        _ = try write("# New", to: folder, name: "New.md", modified: now)
        let (model, editor) = makeModel(folder)

        model.start()
        expectEqual(model.current?.title, "New")
        expectEqual(model.documents.count, 2)
        expectEqual(editor.shown, ["# New"])
    }

    test("start in an empty folder makes a new document") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let (model, editor) = makeModel(folder)

        model.start()
        expectEqual(model.current?.url.lastPathComponent, "Untitled.md")
        expectEqual(editor.shown, [""])
    }

    test("a save writes the editor text and renames the file from its heading") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let (model, editor) = makeModel(folder)
        model.start()

        editor.text = "# Questions for the Clinic\n\nAsk."
        model.edited()
        model.save()
        expectEqual(model.current?.title, "Questions for the Clinic")
        expectEqual(names(model.documents), ["Questions for the Clinic.md"])

        editor.text = "# Questions for the Clinic\n\nAsk on Friday."
        model.edited()
        model.save()
        let saved = folder.appendingPathComponent("Questions for the Clinic.md")
        expectEqual(try String(contentsOf: saved, encoding: .utf8), "# Questions for the Clinic\n\nAsk on Friday.")
    }

    test("a new document saves the open document first") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let first = try write("# First", to: folder, name: "First.md", modified: now)
        let (model, editor) = makeModel(folder)
        model.start()

        editor.text = "# First\n\nlast words"
        model.edited()
        model.newDocument()
        expectEqual(try String(contentsOf: first, encoding: .utf8), "# First\n\nlast words")
        expectEqual(model.current?.url.lastPathComponent, "Untitled.md")
        expectEqual(editor.shown.last, "")
    }

    test("a save before start writes nothing") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let (model, editor) = makeModel(folder)
        editor.text = "# Lost"
        model.edited()
        model.save()
        expectEqual(try DocumentLibrary(folder: folder).documents().count, 0)
    }

    test("a save that fails keeps the error for the paper, and the next save clears it") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let (model, editor) = makeModel(folder)
        model.start()
        try FileManager.default.removeItem(at: folder)
        try Data().write(to: folder)

        editor.text = "# Gone"
        model.edited()
        model.save()
        expect(model.failure != nil, "the failure is kept")

        try FileManager.default.removeItem(at: folder)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        model.save()
        expectEqual(model.failure, nil)
    }

    test("an edit saves after the save delay, not before") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let notes = try write("# Notes", to: folder, name: "Notes.md", modified: now)
        let clock = FakeClock()
        let (model, editor) = makeModel(folder, clock: clock)
        model.start()

        editor.text = "# Notes\n\nBuy milk."
        model.edited()
        clock.advance(to: WriteModel.saveDelay / 2)
        expectEqual(try String(contentsOf: notes, encoding: .utf8), "# Notes")
        clock.advance(to: WriteModel.saveDelay)
        expectEqual(try String(contentsOf: notes, encoding: .utf8), "# Notes\n\nBuy milk.")
    }

    test("a switch to another document saves the edit of the old document once") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let plans = try write("# Plans", to: folder, name: "Plans.md", modified: now - 100)
        let notes = try write("# Notes", to: folder, name: "Notes.md", modified: now)
        let clock = FakeClock()
        let (model, editor) = makeModel(folder, clock: clock)
        model.start()

        editor.text = "# Notes\n\nBuy milk."
        model.edited()
        model.select(plans)
        clock.advance(to: WriteModel.saveDelay * 2)
        expectEqual(editor.reads, 1)
        expectEqual(try String(contentsOf: notes, encoding: .utf8), "# Notes\n\nBuy milk.")
        expectEqual(try String(contentsOf: plans, encoding: .utf8), "# Plans")
    }

    test("select opens a document once, and a wiki link opens it by title") {
        let folder = makeFolder()
        defer { try? FileManager.default.removeItem(at: folder) }
        let plans = try write("# Plans", to: folder, name: "Plans.md", modified: now - 100)
        _ = try write("# Notes", to: folder, name: "Notes.md", modified: now)
        let (model, editor) = makeModel(folder)
        model.start()

        model.select(plans)
        model.select(plans)
        expectEqual(model.current?.title, "Plans")
        expectEqual(editor.shown, ["# Notes", "# Plans"])

        model.openLink(title: "Notes")
        expectEqual(model.current?.title, "Notes")
        model.openLink(title: "Missing")
        expectEqual(model.current?.title, "Notes")
    }

    // MARK: The Write panel

    test("the keys of the Documents panel with no Command are the moves of the Find field") {
        let panel = try PanelStore.bundled().writeDocuments
        let actions = Dictionary(uniqueKeysWithValues: panel.buttons.map { ($0.id, $0.action) })
        func key(_ key: VirtualKey) -> PanelAction {
            .shortcut(Shortcut(modifiers: [], key: .virtual(key)))
        }
        expectEqual(actions["open"], key(.return))
        expectEqual(actions["previous"], key(.left))
        expectEqual(actions["next"], key(.right))
        expectEqual(actions["back"], key(.escape))
    }
}
