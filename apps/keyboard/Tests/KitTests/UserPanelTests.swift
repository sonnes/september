import Foundation
import SeptemberKit

/// Private text for the tests. The tests never touch the Keychain.
final class MemoryPrivateTexts: PrivateTextStore, @unchecked Sendable {
    var texts: [String: String] = [:]

    func text(for id: String) throws -> String? { texts[id] }
    func setText(_ text: String, for id: String) throws { texts[id] = text }
    func removeText(for id: String) throws { texts[id] = nil }
}

/// Use counts for the tests, in place of a `UsageStore`.
@MainActor
final class FixedUsage: ButtonUsage {
    var counts: [String: Int] = [:]

    func uses(of buttonID: String) -> Int { counts[buttonID] ?? 0 }
}

func temporaryDirectory() -> URL {
    FileManager.default.temporaryDirectory
        .appendingPathComponent("september-mypanel-tests-\(UUID().uuidString)")
}

@MainActor
private func makeStore(
    file: URL = temporaryDirectory().appendingPathComponent("my-panel.json"),
    texts: MemoryPrivateTexts = MemoryPrivateTexts()
) throws -> (UserPanelStore, MemoryPrivateTexts, URL) {
    (try UserPanelStore(fileURL: file, privateTexts: texts), texts, file)
}

private func fileText(_ url: URL) -> String {
    (try? String(contentsOf: url, encoding: .utf8)) ?? ""
}

private let saveKeys = Shortcut(modifiers: .command, key: .character("s"))
private let pastePlain = Shortcut(modifiers: [.shift, .command], key: .character("v"))
private let interrupt = Shortcut(modifiers: .control, key: .character("c"))

private func button(_ id: String, _ action: UserAction, name: String? = nil) -> UserButton {
    UserButton(id: id, name: name ?? id, action: action)
}

@MainActor
func userPanelTests() {
    userButtonTests()
    userPanelStoreTests()
    minePageTests()
    privateTextControllerTests()
    shortcutSpecTests()
    importerTests()
}

// MARK: - The button model

@MainActor
private func userButtonTests() {
    test("each kind of user button round-trips through JSON") {
        let buttons = [
            button("a", .shortcut(pastePlain)),
            button("b", .sequence([interrupt, interrupt])),
            button("c", .text("See you soon")),
            button("d", .privateText),
            button("e", .shortcut(Shortcut(modifiers: [], key: .virtual(.f12)))),
        ]
        let data = try JSONEncoder().encode(buttons)
        expectEqual(try JSONDecoder().decode([UserButton].self, from: data), buttons)
    }

    test("a sequence decodes from the JSON of the panels") {
        let json = """
            {"id": "x", "name": "Rewind", "action": {"type": "sequence", "keys": [
              {"modifiers": [], "key": "escape"}, {"modifiers": [], "key": "escape"}]}}
            """
        let decoded = try JSONDecoder().decode(UserButton.self, from: Data(json.utf8))
        let escape = Shortcut(modifiers: [], key: .virtual(.escape))
        expectEqual(decoded.action, .sequence([escape, escape]))
    }

    test("an unknown action type does not decode") {
        let json = #"{"id": "x", "name": "X", "action": {"type": "explode"}}"#
        expect((try? JSONDecoder().decode(UserButton.self, from: Data(json.utf8))) == nil)
    }

    test("a button shows its keys, and a text button shows its name") {
        expectEqual(button("a", .shortcut(pastePlain)).keysLabel, "⇧⌘V")
        expectEqual(button("b", .sequence([interrupt, interrupt])).keysLabel, "⌃C ⌃C")
        expectEqual(button("c", .text("Hi there"), name: "Greeting").keysLabel, nil)
        expect(button("c", .text("Hi")).isWide)
        expect(button("d", .privateText).isWide)
        expect(!button("a", .shortcut(pastePlain)).isWide)
    }

    test("the accessibility label names a private button and never holds text") {
        let home = button("d", .privateText, name: "Home Address")
        expectEqual(home.accessibilityLabel, "Home Address, private text")
        expectEqual(
            button("a", .shortcut(pastePlain), name: "Paste as Text").accessibilityLabel,
            "Paste as Text, Shift Command V")
        expectEqual(
            button("b", .sequence([interrupt, interrupt]), name: "Exit").accessibilityLabel,
            "Exit, Control C, then Control C")
    }

    test("a text action hides its text when it is printed") {
        let secret = "4111 1111"
        expect(!String(describing: UserAction.text(secret)).contains(secret))
        expect(!String(reflecting: UserAction.text(secret)).contains(secret))
        expect(!String(describing: NewButtonAction.text(secret)).contains(secret))
        expect(!String(reflecting: NewButton(name: "Card", action: .text(secret))).contains(secret))
    }
}

// MARK: - The store

@MainActor
private func userPanelStoreTests() {
    test("a missing file gives an empty panel that makes new text private") {
        let (store, _, _) = try makeStore()
        expect(store.buttons.isEmpty)
        expect(store.makeNewTextPrivate)
    }

    test("a broken file throws and is left alone") {
        let file = temporaryDirectory().appendingPathComponent("my-panel.json")
        try FileManager.default.createDirectory(
            at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("{ not json".utf8).write(to: file)
        expect((try? makeStore(file: file)) == nil, "a broken file loaded anyway")
        expectEqual(fileText(file), "{ not json")
    }

    test("new private text goes to the keychain, and the file holds only its name") {
        let (store, texts, file) = try makeStore()
        let id = try store.add(NewButton(name: "Home Address", action: .text("1 Main Street")))
        expectEqual(store.buttons.map(\.action), [.privateText])
        expectEqual(texts.texts[id], "1 Main Street")
        expect(fileText(file).contains("Home Address"))
        expect(!fileText(file).contains("1 Main Street"), "the file holds the private text")
    }

    test("with the switch off, new text stays in the file") {
        let (store, texts, file) = try makeStore()
        store.makeNewTextPrivate = false
        try store.add(NewButton(name: "Greeting", action: .text("Hello there")))
        expectEqual(store.buttons.map(\.action), [.text("Hello there")])
        expect(texts.texts.isEmpty)
        expect(fileText(file).contains("Hello there"))
    }

    test("the store loads what it saved, with the switch") {
        let (store, texts, file) = try makeStore()
        store.makeNewTextPrivate = false
        try store.add(NewButton(name: "Save", action: .shortcut(saveKeys)))
        try store.add(NewButton(name: "Exit", action: .sequence([interrupt, interrupt])))
        let (reloaded, _, _) = try makeStore(file: file, texts: texts)
        expectEqual(reloaded.buttons, store.buttons)
        expect(!reloaded.makeNewTextPrivate)
    }

    test("private on and off moves the text between the keychain and the file") {
        let (store, texts, file) = try makeStore()
        store.makeNewTextPrivate = false
        let id = try store.add(NewButton(name: "Phone", action: .text("555 0100")))

        try store.setPrivate(true, for: id)
        expectEqual(store.buttons.first?.action, .privateText)
        expectEqual(texts.texts[id], "555 0100")
        expect(!fileText(file).contains("555 0100"))

        try store.setPrivate(false, for: id)
        expectEqual(store.buttons.first?.action, .text("555 0100"))
        expect(texts.texts[id] == nil, "the keychain kept a copy")
    }

    test("removing a private button removes its keychain item") {
        let (store, texts, _) = try makeStore()
        let id = try store.add(NewButton(name: "PIN", action: .text("0000")))
        try store.remove(id: id)
        expect(store.buttons.isEmpty)
        expect(texts.texts.isEmpty)
    }

    test("the panel ranks the buttons by use, and a tie keeps the saved order") {
        let (store, _, _) = try makeStore()
        let save = try store.add(NewButton(name: "Save", action: .shortcut(saveKeys)))
        let paste = try store.add(NewButton(name: "Paste", action: .shortcut(pastePlain)))
        let exit = try store.add(NewButton(name: "Exit", action: .sequence([interrupt])))
        let usage = FixedUsage()
        usage.counts = [paste: 9, exit: 2]
        expectEqual(store.ranked(by: usage).map(\.id), [paste, exit, save])
        usage.counts = [:]
        expectEqual(store.ranked(by: usage).map(\.id), [save, paste, exit])
    }

    test("the import adds keys and sequences, and text as private by default") {
        let (store, texts, file) = try makeStore()
        let imported = [
            NewButton(name: "Paste as Text", action: .shortcut(pastePlain)),
            NewButton(name: "Exit", action: .sequence([interrupt, interrupt])),
            NewButton(name: "Account", action: .text("12-3456-78")),
        ]
        let added = try store.importButtons(imported, textAsPrivate: true)
        expectEqual(added, 3)
        expectEqual(store.buttons.map(\.action), [
            .shortcut(pastePlain), .sequence([interrupt, interrupt]), .privateText,
        ])
        expectEqual(Array(texts.texts.values), ["12-3456-78"])
        expect(!fileText(file).contains("12-3456-78"))
    }

    test("the import skips keys that the panel already has") {
        let (store, _, _) = try makeStore()
        try store.add(NewButton(name: "Save", action: .shortcut(saveKeys)))
        let added = try store.importButtons(
            [NewButton(name: "Save File", action: .shortcut(saveKeys))], textAsPrivate: true)
        expectEqual(added, 0)
        expectEqual(store.buttons.count, 1)
    }

    test("the import can keep text out of the keychain") {
        let (store, texts, _) = try makeStore()
        try store.importButtons(
            [NewButton(name: "Sign-off", action: .text("Best, Sam"))], textAsPrivate: false)
        expectEqual(store.buttons.map(\.action), [.text("Best, Sam")])
        expect(texts.texts.isEmpty)
    }
}

// MARK: - Pages of Mine

private func singles(_ count: Int, from start: Int = 0) -> [UserButton] {
    (start..<start + count).map { button("k\($0)", .shortcut(saveKeys)) }
}

private func wides(_ count: Int, from start: Int = 0) -> [UserButton] {
    (start..<start + count).map { button("t\($0)", .privateText) }
}

private func ids(_ cell: MineCell) -> String {
    switch cell {
    case .button(let button): button.id
    case .page(let index, let count): "page \(index + 1)/\(count)"
    case .empty: "-"
    }
}

private func describe(_ rows: [MineRow]) -> [String] {
    rows.map { row in
        switch row {
        case .wide(let cell): ids(cell)
        case .pair(let left, let right): "\(ids(left)) \(ids(right))"
        }
    }
}

@MainActor
private func minePageTests() {
    test("twelve slots fit on one page with no page button") {
        let pages = MinePages.pages(singles(8) + wides(2))
        expectEqual(pages.count, 1)
        expectEqual(pages[0].count, 10)
    }

    test("a longer panel has pages of 11 slots") {
        let pages = MinePages.pages(singles(30))
        expectEqual(pages.map(\.count), [11, 11, 8])
    }

    test("a wide button that does not fit starts the next page") {
        let pages = MinePages.pages(singles(10) + wides(1) + singles(1, from: 10))
        expectEqual(pages.map { $0.map(\.id) }, [
            singles(10).map(\.id), ["t0", "k10"],
        ])
    }

    test("the rows pack single buttons around wide ones, and end with the page button") {
        let page = singles(1) + wides(1) + singles(2, from: 1) + wides(3, from: 1)
        let rows = MinePages.rows(for: page, page: 0, of: 3)
        expectEqual(describe(rows), [
            "k0 k1", "t0", "k2 page 1/3", "t1", "t2", "t3",
        ])
    }

    test("a short page fills the grid with empty slots") {
        let rows = MinePages.rows(for: singles(3), page: 0, of: 1)
        expectEqual(describe(rows), ["k0 k1", "k2 -", "- -", "- -", "- -", "- -"])
    }

    test("the page button names the page and goes to the next one") {
        expectEqual(MinePages.pageAccessibilityLabel(page: 0, of: 6), "Next page. Page 1 of 6")
        expectEqual(MinePages.next(after: 0, of: 6), 1)
        expectEqual(MinePages.next(after: 5, of: 6), 0)
    }
}

// MARK: - Private text in the controller

private func field(_ text: String?, secure: Bool = false) -> FocusedField {
    FocusedField(
        appName: "Messages", role: "AXTextArea", isEditable: true, isSecure: secure,
        text: text, selection: nil)
}

@MainActor
private func privateController() throws -> (KeyboardController, RecordingSink, MemoryPrivateTexts) {
    let (controller, sink) = try makeController()
    let texts = MemoryPrivateTexts()
    texts.texts["home"] = "1 Main Street"
    controller.privateTexts = texts
    return (controller, sink, texts)
}

@MainActor
private func privateTextControllerTests() {
    test("a private text button types the text, echoes nothing, and hides the field") {
        let (controller, sink, _) = try privateController()
        controller.perform(.privateText("home"))
        expectEqual(sink.typed, ["1 Main Street"])
        expect(controller.isFieldPrivate)
        expectEqual(controller.input, .secure)
    }

    test("the hidden field keeps none of its text as it changes") {
        let (controller, _, _) = try privateController()
        controller.focusChanged(to: field("Hi"))
        controller.perform(.privateText("home"))
        controller.focusChanged(to: field("Hi 1 Main Street"))
        expectEqual(controller.input, .secure)
        expect(controller.focusedField?.text == nil, "the controller kept the private text")
        expectEqual(controller.focusedField?.appName, "Messages")
    }

    test("keys typed after private text are not echoed") {
        let (controller, sink, _) = try privateController()
        controller.perform(.privateText("home"))
        controller.perform(.text("!"))
        controller.focusChanged(to: nil)
        expectEqual(controller.input, .secure)
        expectEqual(sink.typed, ["1 Main Street", "!"])
    }

    test("the private state ends when the focus moves to another field") {
        let (controller, _, _) = try privateController()
        controller.perform(.privateText("home"))
        controller.focusMoved()
        expect(!controller.isFieldPrivate)
        controller.focusChanged(to: field("New field"))
        expectEqual(controller.input, .mirrored(text: "New field", caret: 9, selectionLength: 0))
    }

    test("an app switch ends the private state") {
        let (controller, _, _) = try privateController()
        controller.perform(.privateText("home"))
        controller.appChanged(name: "Notes")
        expect(!controller.isFieldPrivate)
        expectEqual(controller.input, .local(text: ""))
    }

    test("a focus move with no private text changes nothing") {
        let (controller, _, _) = try privateController()
        controller.perform(.text("abc"))
        controller.focusMoved()
        expectEqual(controller.input, .local(text: "abc"))
    }

    test("private text with no keychain item types nothing and hides nothing") {
        let (controller, sink, _) = try privateController()
        controller.perform(.privateText("gone"))
        expect(sink.typed.isEmpty)
        expect(!controller.isFieldPrivate)
    }

    test("a user button presses its keys, its sequence, or its private text") {
        let (controller, sink, _) = try privateController()
        controller.perform(button("seq", .sequence([interrupt, interrupt])))
        expectEqual(sink.downs.map(\.key), [59, 8, 59, 8])
        sink.reset()
        controller.perform(button("home", .privateText, name: "Home"))
        expectEqual(sink.typed, ["1 Main Street"])
        expect(controller.isFieldPrivate)
    }

    test("a private button has a spoken label with no text") {
        let panelButton = PanelButton(
            id: "home", label: "Home Address", symbol: nil, action: .privateText("home"))
        expectEqual(panelButton.accessibilityLabel, "Home Address")
        expect(panelButton.hint == nil)
    }
}

// MARK: - Typed shortcuts

@MainActor
private func shortcutSpecTests() {
    test("a typed shortcut parses into keys") {
        expectEqual(ShortcutSpec.parse("cmd+shift+v"), [pastePlain])
        expectEqual(ShortcutSpec.parse("⇧⌘V"), [pastePlain])
        expectEqual(ShortcutSpec.parse("ctrl+c ctrl+c"), [interrupt, interrupt])
        expectEqual(ShortcutSpec.parse("⌃C ⌃C"), [interrupt, interrupt])
        let escape = Shortcut(modifiers: [], key: .virtual(.escape))
        expectEqual(ShortcutSpec.parse("esc esc"), [escape, escape])
        expectEqual(ShortcutSpec.parse("F12"), [Shortcut(modifiers: [], key: .virtual(.f12))])
        expectEqual(
            ShortcutSpec.parse("option+up"), [Shortcut(modifiers: .option, key: .virtual(.up))])
    }

    test("a typed shortcut that names no key does not parse") {
        expect(ShortcutSpec.parse("") == nil)
        expect(ShortcutSpec.parse("cmd+") == nil)
        expect(ShortcutSpec.parse("hyper+x") == nil)
        expect(ShortcutSpec.parse("cmd+banana") == nil)
    }

    test("a shortcut prints back as the spec it came from") {
        expectEqual(ShortcutSpec.format([pastePlain]), "shift+command+v")
        expectEqual(ShortcutSpec.format([interrupt, interrupt]), "control+c control+c")
    }
}
