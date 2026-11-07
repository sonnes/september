import CoreGraphics
import Foundation
import SeptemberKit

/// A folder for the documents and a folder for the Trash, in the temporary
/// directory. The tests never touch `~/Documents` or the Trash of the user.
private struct DeskFolders {
    let documents: URL
    let trash: URL

    init() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("september-write-desk-\(UUID().uuidString)", isDirectory: true)
        documents = root.appendingPathComponent("Documents", isDirectory: true)
        trash = root.appendingPathComponent("Trash", isDirectory: true)
        try FileManager.default.createDirectory(at: documents, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: trash, withIntermediateDirectories: true)
    }

    var library: DocumentLibrary {
        DocumentLibrary(folder: documents, trash: .folder(trash))
    }

    func remove() {
        try? FileManager.default.removeItem(at: documents.deletingLastPathComponent())
    }

    @discardableResult
    func add(_ name: String, _ text: String, modified: Date) throws -> URL {
        let url = documents.appendingPathComponent(name)
        try Data(text.utf8).write(to: url)
        try FileManager.default.setAttributes([.modificationDate: modified], ofItemAtPath: url.path)
        return url
    }
}

@MainActor
private func deskModel(_ folders: DeskFolders) -> (WriteModel, () -> String) {
    var text = ""
    let model = WriteModel(library: folders.library)
    model.show = { text = $0 }
    model.editorText = { text }
    return (model, { text })
}

private func doc(_ title: String, _ minutes: Double = 0) -> WriteDocument {
    WriteDocument(
        url: URL(fileURLWithPath: "/tmp/\(title).md"),
        modified: Date(timeIntervalSince1970: 1_800_000_000 - minutes * 60))
}

@MainActor
func writeDeskTests() {
    let now = Date()

    // MARK: DocumentLibrary

    test("Duplicate copies a document as “Title 2”, and the copy is the newest") {
        let folders = try DeskFolders()
        defer { folders.remove() }
        let plans = try folders.add("Plans.md", "# Plans\n\nTulips.", modified: now - 3_600)
        try folders.add("Notes.md", "# Notes", modified: now - 60)
        let library = folders.library

        let copy = try library.duplicate(WriteDocument(url: plans, modified: now - 3_600))
        expectEqual(copy.title, "Plans 2")
        expectEqual(try library.read(copy), "# Plans\n\nTulips.")
        expectEqual(try library.documents().map(\.title), ["Plans 2", "Notes", "Plans"])
    }

    test("Move to Trash takes a document out of the folder, and Undo puts it back") {
        let folders = try DeskFolders()
        defer { folders.remove() }
        let plans = try folders.add("Plans.md", "# Plans", modified: now)
        let library = folders.library

        let trashed = try library.moveToTrash(WriteDocument(url: plans, modified: now))
        expectEqual(try library.documents().count, 0)
        expect(FileManager.default.fileExists(atPath: trashed.path), "the file is in the Trash")

        let back = try library.restore(trashed, as: "Plans")
        expectEqual(back.url.lastPathComponent, "Plans.md")
        expectEqual(try library.read(back), "# Plans")
    }

    test("Undo of Move to Trash picks a free name when the old name is taken") {
        let folders = try DeskFolders()
        defer { folders.remove() }
        let plans = try folders.add("Plans.md", "# Plans", modified: now)
        let library = folders.library

        let trashed = try library.moveToTrash(WriteDocument(url: plans, modified: now))
        try folders.add("Plans.md", "# Plans again", modified: now)
        let back = try library.restore(trashed, as: "Plans")
        expectEqual(back.url.lastPathComponent, "Plans 2.md")
    }

    test("a card shows the first lines of a document without the heading or the marks") {
        expectEqual(
            DocumentLibrary.preview(of: "# Clinic\n\nAsk about **the night** machine.\n\n- [ ] Mask\n- Visit", lines: 2),
            ["Ask about the night machine.", "Mask"])
        expectEqual(DocumentLibrary.preview(of: "", lines: 3), [])
        expectEqual(DocumentLibrary.preview(of: "No heading here", lines: 3), ["No heading here"])
    }

    // MARK: WriteModel

    test("Duplicate saves the open document first, and the copy comes first in the list") {
        let folders = try DeskFolders()
        defer { folders.remove() }
        try folders.add("Plans.md", "# Plans", modified: now)
        let (model, _) = deskModel(folders)
        var text = "# Plans\n\nlast words"
        model.editorText = { text }
        model.start()
        text = "# Plans\n\nlast words"

        let copy = model.duplicate(model.documents[0].url)
        expectEqual(copy?.title, "Plans 2")
        expectEqual(model.documents.map(\.title), ["Plans 2", "Plans"])
        expectEqual(try model.library.read(model.documents[1]), "# Plans\n\nlast words")
        expectEqual(model.current?.title, "Plans", "the open document stays open")
    }

    test("Move to Trash of the open document leaves no document open, and Undo opens it again") {
        let folders = try DeskFolders()
        defer { folders.remove() }
        try folders.add("Old.md", "# Old", modified: now - 100)
        try folders.add("New.md", "# New", modified: now)
        let (model, shown) = deskModel(folders)
        model.start()

        model.moveToTrash(model.documents[0].url)
        expectEqual(model.documents.map(\.title), ["Old"])
        expectEqual(model.current, nil)
        expectEqual(model.trashed?.title, "New")

        let back = model.undoTrash()
        expectEqual(back?.title, "New")
        expectEqual(model.trashed, nil)
        expectEqual(model.documents.map(\.title), ["New", "Old"])
        model.select(try expectValue(back).url)
        expectEqual(shown(), "# New")
    }

    test("Move to Trash of another document keeps the open document") {
        let folders = try DeskFolders()
        defer { folders.remove() }
        try folders.add("Old.md", "# Old", modified: now - 100)
        try folders.add("New.md", "# New", modified: now)
        let (model, _) = deskModel(folders)
        model.start()

        model.moveToTrash(model.documents[1].url)
        expectEqual(model.current?.title, "New")
        expectEqual(model.documents.map(\.title), ["New"])
    }

    test("select opens a document when no document is open") {
        let folders = try DeskFolders()
        defer { folders.remove() }
        try folders.add("Old.md", "# Old", modified: now - 100)
        try folders.add("New.md", "# New", modified: now)
        let (model, shown) = deskModel(folders)
        model.start()
        model.moveToTrash(model.documents[0].url)

        model.select(model.documents[0].url)
        expectEqual(model.current?.title, "Old")
        expectEqual(shown(), "# Old")
    }

    // MARK: WriteDesk

    test("the desk shows New Document first, then the documents, newest first") {
        let desk = WriteDesk(documents: [doc("Clinic"), doc("Garden", 5)], current: nil)
        expectEqual(desk.items, [.newDocument, .document(doc("Clinic")), .document(doc("Garden", 5))])
        expectEqual(desk.selection, 1, "the first document is selected")
        expectEqual(desk.count, "2 documents")
    }

    test("the desk selects the card of the open document") {
        let desk = WriteDesk(documents: [doc("Clinic"), doc("Garden", 5)], current: doc("Garden", 5).url)
        expectEqual(desk.selected, .document(doc("Garden", 5)))
    }

    test("Find keeps the documents whose title has the query, in any case or accent") {
        var desk = WriteDesk(documents: [doc("Clinic"), doc("Garden Plans", 5), doc("Café", 9)], current: nil)
        desk.query = "gar"
        expectEqual(desk.items, [.newDocument, .document(doc("Garden Plans", 5))])
        expectEqual(desk.selection, 1)
        expectEqual(desk.count, "1 of 3")

        desk.query = "cafe"
        expectEqual(desk.selected, .document(doc("Café", 9)))

        desk.query = "zebra"
        expectEqual(desk.items, [.newDocument])
        expectEqual(desk.selection, 0, "New Document is selected when nothing matches")
        expectEqual(desk.count, "0 of 3")
    }

    test("the arrows move the selection and stop at the ends") {
        var desk = WriteDesk(documents: [doc("A"), doc("B", 1)], current: nil)
        desk.move(by: -1)
        expectEqual(desk.selected, .newDocument)
        desk.move(by: -1)
        expectEqual(desk.selection, 0)
        desk.move(by: 5)
        expectEqual(desk.selected, .document(doc("B", 1)))
    }

    test("new documents keep the selection on the same document") {
        var desk = WriteDesk(documents: [doc("A"), doc("B", 1)], current: doc("B", 1).url)
        desk.documents = [doc("A 2"), doc("A"), doc("B", 1)]
        expectEqual(desk.selected, .document(doc("B", 1)))
        desk.select(doc("A 2").url)
        expectEqual(desk.selection, 1)
        desk.documents = [doc("A"), doc("B", 1)]
        expectEqual(desk.selected, .document(doc("A")), "the next card takes the place of a removed one")
    }

    // MARK: WriteDeskLayout

    test("the cards stand in one row, centred on the input bar") {
        let area = CGRect(x: 0, y: 400, width: 1600, height: 600)
        let layout = WriteDeskLayout(area: area, centre: 800, count: 3, selection: 0)
        expectEqual(layout.visible, 0..<3)
        let size = WriteDeskLayout.cardSize
        let gap = WriteDeskLayout.cardGap
        let width = 3 * size.width + 2 * gap
        expectEqual(layout.cards[0].minX, 800 - width / 2)
        expectEqual(layout.cards[2].maxX, 800 + width / 2)
        expectEqual(layout.cards[0].minY, area.minY + WriteDeskLayout.bottomPadding)
        expect(layout.find.minY > layout.actions.maxY, "the Find field is above the actions")
        expect(layout.actions.minY > layout.cards[0].maxY, "the actions are above the cards")
    }

    test("the blur behind the desk holds the cards, the actions, and the Find field") {
        let area = CGRect(x: 0, y: 400, width: 1600, height: 600)
        let layout = WriteDeskLayout(area: area, centre: 800, count: 3, selection: 1)
        let backdrop = layout.backdrop(withNotice: false)
        for card in layout.cards {
            expect(backdrop.contains(card.offsetBy(dx: 0, dy: WriteDeskLayout.selectedLift)), "a raised card is inside")
        }
        expect(backdrop.contains(layout.find), "the Find field is inside")
        expect(backdrop.maxY < layout.notice.maxY, "the notice is outside while it is hidden")
        expect(layout.backdrop(withNotice: true).contains(layout.notice), "the notice is inside while it shows")
        expect(area.contains(layout.backdrop(withNotice: true)), "the blur stays in the space above the keyboard")
    }

    test("the cards stay on the screen when the bar is near its edge") {
        let area = CGRect(x: 0, y: 400, width: 1600, height: 600)
        let layout = WriteDeskLayout(area: area, centre: 100, count: 3, selection: 0)
        expectEqual(layout.cards[0].minX, area.minX)
    }

    test("a row with more cards than the width shows the cards around the selection") {
        let area = CGRect(x: 0, y: 400, width: 1000, height: 600)
        let first = WriteDeskLayout(area: area, centre: 500, count: 20, selection: 0)
        let fits = first.visible.count
        expect(fits >= 3 && fits < 20, "a part of the row fits")
        expectEqual(first.visible.lowerBound, 0)
        expectEqual(first.cards.count, fits)

        let last = WriteDeskLayout(area: area, centre: 500, count: 20, selection: 19)
        expectEqual(last.visible.upperBound, 20)
        let middle = WriteDeskLayout(area: area, centre: 500, count: 20, selection: 10)
        expect(middle.visible.contains(10), "the selected card is in view")
    }
}
