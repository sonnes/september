import Foundation
import SeptemberKit

@MainActor
func storageTests() {
    databaseTests()
    sentenceHistoryTests()
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
private func sentenceHistoryTests() {
    let day: TimeInterval = 24 * 3600

    func makeHistory(
        now: @escaping () -> Date = Date.init, limit: Int = SentenceHistory.rowLimit,
        defaults: UserDefaults = UserDefaults(suiteName: "kit-tests-\(UUID().uuidString)")!
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
        let defaults = UserDefaults(suiteName: "kit-tests-\(UUID().uuidString)")!
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
        let defaults = UserDefaults(suiteName: "kit-tests-\(UUID().uuidString)")!
        SentenceHistory(database: KeyboardDatabase.open(at: url), defaults: defaults).record("Good night.")
        let again = SentenceHistory(database: KeyboardDatabase.open(at: url), defaults: defaults)
        expectEqual(again.matches(for: "Good"), ["Good night."])
    }
}
