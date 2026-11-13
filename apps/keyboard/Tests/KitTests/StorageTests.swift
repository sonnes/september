import Foundation
import SeptemberKit

@MainActor
func storageTests() {
    databaseTests()
    legacyImportTests()
    sentenceHistoryTests()
}

func memoryDatabase() -> KeyboardDatabase {
    try! KeyboardDatabase(path: ":memory:")
}

private func temporaryFolder() throws -> URL {
    let folder = FileManager.default.temporaryDirectory
        .appendingPathComponent("kit-tests-\(UUID().uuidString)", isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    return folder
}

@MainActor
private func databaseTests() {
    test("a new database has the latest schema version") {
        let database = try KeyboardDatabase(path: ":memory:")
        expectEqual(database.version, KeyboardDatabase.migrations.count)
    }

    test("the database keeps its rows across opens, in a file that only the user can read") {
        let url = try temporaryFolder().appendingPathComponent("keyboard.sqlite")
        do {
            let database = KeyboardDatabase.open(at: url)
            try database.execute(
                "INSERT INTO sentence (text, key, first_at, last_at) VALUES (?, ?, ?, ?)",
                [.text("Hello."), .text("hello."), .double(1), .double(1)])
        }
        let again = KeyboardDatabase.open(at: url)
        let rows = try again.query("SELECT text FROM sentence")
        expectEqual(rows.map { $0[0] }, [.text("Hello.")])
        let mode = try FileManager.default.attributesOfItem(atPath: url.path)[.posixPermissions] as? Int
        expectEqual(mode, 0o600)
    }

    test("the write-ahead files of the database are readable only by the user") {
        let folder = try temporaryFolder()
        let url = folder.appendingPathComponent("keyboard.sqlite")
        let database = KeyboardDatabase.open(at: url)
        try database.execute(
            "INSERT INTO sentence (text, key, first_at, last_at) VALUES (?, ?, ?, ?)",
            [.text("Hello."), .text("hello."), .double(1), .double(1)])
        for suffix in ["-wal", "-shm"] {
            let path = url.path + suffix
            expect(FileManager.default.fileExists(atPath: path))
            let mode = try FileManager.default.attributesOfItem(atPath: path)[.posixPermissions] as? Int
            expectEqual(mode, 0o600)
        }
    }

    test("an old database file that others can read becomes readable only by the user") {
        let folder = try temporaryFolder()
        let url = folder.appendingPathComponent("keyboard.sqlite")
        do {
            let database = try KeyboardDatabase(path: url.path)
            try database.execute(
                "INSERT INTO sentence (text, key, first_at, last_at) VALUES (?, ?, ?, ?)",
                [.text("Hello."), .text("hello."), .double(1), .double(1)])
            for suffix in ["", "-wal", "-shm"] {
                try FileManager.default.setAttributes([.posixPermissions: 0o644], ofItemAtPath: url.path + suffix)
            }
            _ = KeyboardDatabase.open(at: url)
            for suffix in ["", "-wal", "-shm"] {
                let mode = try FileManager.default.attributesOfItem(atPath: url.path + suffix)[.posixPermissions] as? Int
                expectEqual(mode, 0o600)
            }
        }
    }

    test("a file that is not a database moves aside, and a new database opens") {
        let folder = try temporaryFolder()
        let url = folder.appendingPathComponent("keyboard.sqlite")
        try Data(repeating: 7, count: 4096).write(to: url)
        let database = KeyboardDatabase.open(at: url)
        expectEqual(database.version, KeyboardDatabase.migrations.count)
        expect(FileManager.default.fileExists(atPath: folder.appendingPathComponent("keyboard.broken.sqlite").path))
    }

    test("a query gives back each kind of value") {
        let database = try KeyboardDatabase(path: ":memory:")
        let rows = try database.query("SELECT ?, ?, ?, ?", [.int(42), .double(1.5), .text("tea"), .null])
        expectEqual(rows, [[.int(42), .double(1.5), .text("tea"), .null]])
    }

    test("a failed transaction keeps no change") {
        let database = try KeyboardDatabase(path: ":memory:")
        struct Stop: Error {}
        do {
            try database.transaction {
                try database.execute(
                    "INSERT INTO sentence (text, key, first_at, last_at) VALUES ('a', 'a', 1, 1)")
                throw Stop()
            }
        } catch {}
        expectEqual(try database.query("SELECT count(*) FROM sentence"), [[.int(0)]])
    }
}

@MainActor
private func legacyImportTests() {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let saveKeys = Shortcut(modifiers: .command, key: .character("s"))

    func write(_ text: String, to name: String, in folder: URL) throws {
        try Data(text.utf8).write(to: folder.appendingPathComponent(name))
    }

    func open(_ folder: URL) -> KeyboardDatabase {
        KeyboardDatabase.open(at: folder.appendingPathComponent("keyboard.sqlite"))
    }

    func run(_ folder: URL, defaults: UserDefaults = freshDefaults())
        -> KeyboardDatabase
    {
        let database = open(folder)
        LegacyImport.run(database: database, folder: folder, defaults: defaults)
        return database
    }

    test("the legacy import moves each file once, moves a broken file aside, and removes the stale files") {
        let folder = try temporaryFolder()
        let lines = try String(
            decoding: JSONEncoder().encode([SaidLine(text: "Hello", date: now)]), as: UTF8.self)
        try write(lines, to: "talk-history.json", in: folder)
        try write("{ not json", to: "my-panel.json", in: folder)
        try write("{}", to: "usage.json", in: folder)
        try write("{}", to: "learned.json", in: folder)
        try write("{}", to: "notes.json", in: folder)

        let database = run(folder)
        expectEqual(try database.query("SELECT count(*) FROM talk_line"), [[.int(1)]])
        expectEqual(try database.query("SELECT count(*) FROM user_button"), [[.int(0)]])
        let aside = folder.appendingPathComponent("my-panel.broken.json")
        expectEqual(try String(contentsOf: aside, encoding: .utf8), "{ not json")
        let left = try FileManager.default.contentsOfDirectory(atPath: folder.path)
            .filter { $0.hasSuffix(".json") }.sorted()
        expectEqual(left, ["my-panel.broken.json", "notes.json"])

        try write(lines, to: "talk-history.json", in: folder)
        expectEqual(try run(folder).query("SELECT count(*) FROM talk_line"), [[.int(1)]])
    }

    test("the legacy import moves the old clipboard history into the clip table") {
        let folder = try temporaryFolder()
        let old = [
            ClipboardItem(text: "14 Elm Road", date: now.addingTimeInterval(-60)),
            ClipboardItem(text: "Ward 7, bed 12", date: now.addingTimeInterval(-120)),
        ]
        try JSONEncoder().encode(old).write(to: folder.appendingPathComponent("clipboard-history.json"))
        let history = ClipboardHistory(
            database: run(folder), defaults: freshDefaults(),
            now: { now })
        expectEqual(history.items, old)
    }

    test("the legacy import moves the old Talk history into the talk_line table") {
        let folder = try temporaryFolder()
        let old = [
            SaidLine(text: "Thank you", date: now.addingTimeInterval(-60)),
            SaidLine(text: "Hello", date: now.addingTimeInterval(-120)),
        ]
        try JSONEncoder().encode(old).write(to: folder.appendingPathComponent("talk-history.json"))
        expectEqual(SaidList(database: run(folder), now: { now }).lines, old)
    }

    test("the legacy import moves the old counts of My Panel, and keeps a count that the table has") {
        let folder = try temporaryFolder()
        UsageStore(database: open(folder), now: { now }).record("keep")
        // `UsageStore` wrote its dates in seconds since 2001.
        let at = now.timeIntervalSinceReferenceDate
        try write(
            "{\"apps\": {\"my-panel\": {\"keep\": {\"weight\": 9, \"updated\": \(at)}, \"save\": {\"weight\": 4, \"updated\": \(at)}}}}",
            to: "my-panel-usage.json", in: folder)
        let usage = UsageStore(database: run(folder), now: { now })
        expectEqual(usage.uses(of: "keep"), 1)
        expectEqual(usage.uses(of: "save"), 4)
    }

    test("the legacy import moves the buttons of My Panel and the private text switch") {
        let folder = try temporaryFolder()
        try write(
            """
            {"makeNewTextPrivate": false, "buttons": [
              {"id": "b", "name": "Save", "action": {"type": "shortcut", "modifiers": ["command"], "key": "s"}},
              {"id": "a", "name": "Home", "action": {"type": "privateText"}},
              {"id": "c", "name": "Hi", "action": {"type": "text", "text": "Hello"}}]}
            """, to: "my-panel.json", in: folder)
        let defaults = freshDefaults()
        let store = try UserPanelStore(
            database: run(folder, defaults: defaults), defaults: defaults, privateTexts: MemoryPrivateTexts())
        expectEqual(store.buttons.map(\.id), ["b", "a", "c"])
        expectEqual(store.buttons.map(\.action), [.shortcut(saveKeys), .privateText("a"), .text("Hello")])
        expect(!store.makeNewTextPrivate)
    }
}

@MainActor
private func sentenceHistoryTests() {
    let day: TimeInterval = 24 * 3600

    func makeHistory(
        now: @escaping () -> Date = Date.init, limit: Int = SentenceHistory.rowLimit,
        defaults: UserDefaults = freshDefaults()
    ) throws -> SentenceHistory {
        SentenceHistory(
            database: try KeyboardDatabase(path: ":memory:"), defaults: defaults, now: now, limit: limit)
    }

    test("a submitted text goes into the history one sentence at a time") {
        let history = try makeHistory()
        history.record("Hi there. How are you? I am fine!")
        expectEqual(history.count, 3)
        expectEqual(history.matches(for: "How"), ["How are you?"])
        expectEqual(history.matches(for: "I am"), ["I am fine!"])
    }

    test("the search uses only the sentence at the caret") {
        let history = try makeHistory()
        history.record("I would like a cup of tea.")
        expectEqual(history.matches(for: "Thanks. I would"), ["I would like a cup of tea."])
        expectEqual(history.matches(for: "Thanks. "), [], "a new sentence with no letter yet")
        expectEqual(history.matches(for: "Thanks."), [])
        expectEqual(history.matches(for: ""), [])
    }

    test("the search ignores case, extra spaces, and the form of the apostrophe") {
        let history = try makeHistory()
        history.record("I don't  want  tea.")
        expectEqual(history.matches(for: "i DON\u{2019}T want t"), ["I don't want tea."])
    }

    test("a space after a word matches only the full word") {
        let history = try makeHistory()
        history.record("I would like tea. I wouldn't go.")
        expectEqual(history.matches(for: "I would "), ["I would like tea."])
    }

    test("a sentence that the field already holds is not a match") {
        let history = try makeHistory()
        history.record("Yes please.")
        expectEqual(history.matches(for: "Yes please."), [])
        expectEqual(history.matches(for: "yes please"), ["Yes please."])
    }

    test("a sentence that the user sends again gets one more use and keeps its last form") {
        var now = Date(timeIntervalSince1970: 1_000_000)
        let history = try makeHistory(now: { now })
        history.record("see you soon.")
        now += 60
        history.record("See you soon. See you later.")
        expectEqual(history.count, 2)
        expectEqual(history.matches(for: "See you"), ["See you soon.", "See you later."])
    }

    test("the matches rank by uses, and old uses count less") {
        var now = Date(timeIntervalSince1970: 1_000_000)
        let history = try makeHistory(now: { now })
        for _ in 0..<3 { history.record("Can you call me?") }
        history.record("Can we go now?")
        expectEqual(history.matches(for: "Can"), ["Can you call me?", "Can we go now?"])
        now += 60 * day
        history.record("Can we go now?")
        history.record("Can I help?")
        expectEqual(
            history.matches(for: "Can"), ["Can we go now?", "Can I help?", "Can you call me?"],
            "three uses two months ago count less than one use today")
    }

    test("the matches stop at the limit") {
        let history = try makeHistory()
        history.record("Go one. Go two. Go three. Go four.")
        expectEqual(history.matches(for: "Go", limit: 2).count, 2)
    }

    test("the history keeps the newest sentences up to its limit") {
        var now = Date(timeIntervalSince1970: 1_000_000)
        let history = try makeHistory(now: { now }, limit: 2)
        for text in ["One a.", "One b.", "One c."] {
            history.record(text)
            now += 1
        }
        expectEqual(history.count, 2)
        expectEqual(Set(history.matches(for: "One")), ["One b.", "One c."])
    }

    test("a sentence with no letter or with more than 500 characters is not kept") {
        let history = try makeHistory()
        history.record("42. :)")
        history.record(String(repeating: "a", count: 501) + ".")
        expectEqual(history.count, 0)
    }

    test("Clear removes every sentence") {
        let history = try makeHistory()
        history.record("Hello there.")
        history.clear()
        expectEqual(history.count, 0)
        expectEqual(history.matches(for: "Hello"), [])
    }

    test("the history is on by default, and turning it off removes every sentence") {
        let defaults = freshDefaults()
        let history = try makeHistory(defaults: defaults)
        expect(history.isEnabled)
        history.record("Hello there.")
        history.isEnabled = false
        expectEqual(history.count, 0)
        history.record("Hello again.")
        expectEqual(history.count, 0, "a history that is off keeps nothing")
        expectEqual(history.matches(for: "Hello"), [])
        expect(!(try makeHistory(defaults: defaults)).isEnabled, "the switch keeps its state")
    }

    test("the sentences of a history file stay across launches") {
        let url = try temporaryFolder().appendingPathComponent("keyboard.sqlite")
        let defaults = freshDefaults()
        SentenceHistory(database: KeyboardDatabase.open(at: url), defaults: defaults).record("Good night.")
        let again = SentenceHistory(database: KeyboardDatabase.open(at: url), defaults: defaults)
        expectEqual(again.matches(for: "Good"), ["Good night."])
    }
}
