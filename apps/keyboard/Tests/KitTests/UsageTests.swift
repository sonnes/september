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

    test("the usage store counts the presses of My Panel") {
        let usage = UsageStore(database: memoryDatabase())
        usage.record("save")
        usage.record("save")
        expectEqual(usage.uses(of: "save"), 2)
        expectEqual(usage.uses(of: "other"), 0)
    }

    test("a press of My Panel loses half its weight in 14 days") {
        var now = start
        let usage = UsageStore(database: memoryDatabase(), now: { now })
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
}
