import Foundation
import SeptemberKit

/// The presses of the buttons of My Panel, in the `button_use` table.
@MainActor
func usageTests() {
    let start = Date(timeIntervalSince1970: 1_800_000_000)
    func open(_ folder: URL) -> KeyboardDatabase {
        KeyboardDatabase.open(at: folder.appendingPathComponent("keyboard.sqlite"))
    }
    func rowCount(_ folder: URL) throws -> DatabaseValue? {
        try open(folder).query("SELECT count(*) FROM button_use").first?.first
    }
    /// The old file, as `UsageStore` wrote it: dates in seconds since 2001.
    func writeOldFile(_ url: URL, _ counts: [String: (weight: Double, updated: Date)]) throws {
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let entries = counts.map { id, count in
            "\"\(id)\": {\"weight\": \(count.weight), \"updated\": \(count.updated.timeIntervalSinceReferenceDate)}"
        }
        try Data("{\"apps\": {\"my-panel\": {\(entries.joined(separator: ", "))}}}".utf8).write(to: url)
    }

    test("the usage store counts the presses of My Panel") {
        let usage = UsageStore()
        usage.record("save")
        usage.record("save")
        expectEqual(usage.uses(of: "save"), 2)
        expectEqual(usage.uses(of: "other"), 0)
    }

    test("a press of My Panel loses half its weight in 14 days") {
        var now = start
        let usage = UsageStore(now: { now })
        for _ in 0..<4 { usage.record("save") }
        now += UsageStore.halfLife
        expectEqual(usage.uses(of: "save"), 2)
    }

    test("the counts of My Panel survive a restart in the database") {
        let folder = temporaryDirectory()
        var now = start
        let usage = UsageStore(database: open(folder), now: { now })
        for _ in 0..<4 { usage.record("save") }
        now += UsageStore.halfLife
        usage.record("save")
        expectEqual(UsageStore(database: open(folder), now: { now }).uses(of: "save"), 3)
        expectEqual(try rowCount(folder), .int(1))
    }

    test("a count that has decayed below 0.01 is removed at launch") {
        let folder = temporaryDirectory()
        UsageStore(database: open(folder), now: { start }).record("save")
        let later = start + 7 * UsageStore.halfLife
        expectEqual(UsageStore(database: open(folder), now: { later }).uses(of: "save"), 0)
        expectEqual(try rowCount(folder), .int(0))
    }

    test("the usage store moves the counts of its old JSON file into the database") {
        let folder = temporaryDirectory()
        let json = folder.appendingPathComponent("my-panel-usage.json")
        try writeOldFile(json, ["save": (4, start), "open": (1, start - UsageStore.halfLife)])
        let usage = UsageStore(database: open(folder), importing: json, now: { start })
        expectEqual(usage.uses(of: "save"), 4)
        expectEqual(usage.uses(of: "open"), 1)
        expect(!FileManager.default.fileExists(atPath: json.path))
        let again = UsageStore(database: open(folder), importing: json, now: { start })
        expectEqual(again.uses(of: "save"), 4)
        expectEqual(try rowCount(folder), .int(2))
    }

    test("an import keeps a count that is already in the database") {
        let folder = temporaryDirectory()
        let usage = UsageStore(database: open(folder), now: { start })
        usage.record("save")
        let json = folder.appendingPathComponent("my-panel-usage.json")
        try writeOldFile(json, ["save": (9, start)])
        expectEqual(UsageStore(database: open(folder), importing: json, now: { start }).uses(of: "save"), 1)
    }

    test("a broken old usage file is moved aside, and the counts start empty") {
        let folder = temporaryDirectory()
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let json = folder.appendingPathComponent("my-panel-usage.json")
        try Data("{ not json".utf8).write(to: json)
        let usage = UsageStore(database: open(folder), importing: json, now: { start })
        expectEqual(usage.uses(of: "save"), 0)
        let aside = folder.appendingPathComponent("my-panel-usage.broken.json")
        expectEqual(try String(contentsOf: aside, encoding: .utf8), "{ not json")
        expect(!FileManager.default.fileExists(atPath: json.path))
    }
}
