import Foundation
import SeptemberKit

@MainActor
func talkHistoryTests() {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    func folder() -> URL { temporaryDirectory() }
    func open(_ folder: URL) -> KeyboardDatabase {
        KeyboardDatabase.open(at: folder.appendingPathComponent("keyboard.sqlite"))
    }

    test("the Talk history keeps its lines across launches") {
        let folder = folder()
        let said = SaidList(database: open(folder), now: { now })
        said.add("Good morning", at: now.addingTimeInterval(-60))
        said.add("Can you open the window?", at: now)
        let again = SaidList(database: open(folder), now: { now })
        expectEqual(again.lines.map(\.text), ["Can you open the window?", "Good morning"])
        expectEqual(again.lines.map(\.id), said.lines.map(\.id))
        expectEqual(again.lines.map(\.date), said.lines.map(\.date))
    }

    test("the Talk history drops lines older than 30 days and keeps the newest 1,000") {
        let folder = folder()
        let said = SaidList(database: open(folder), now: { now })
        said.add("Last month", at: now.addingTimeInterval(-31 * 24 * 3600))
        for index in 0..<1005 { said.add("Line \(index)", at: now.addingTimeInterval(Double(index - 1005))) }
        expectEqual(said.lines.count, SaidList.lineLimit)
        expectEqual(said.lines.first?.text, "Line 1004")
        expect(!said.lines.contains { $0.text == "Last month" })
        let rows = try open(folder).query("SELECT count(*) FROM talk_line")
        expectEqual(rows.first?.first, .int(Int64(SaidList.lineLimit)))
    }

    test("a line older than 30 days is gone at the next launch") {
        let folder = folder()
        SaidList(database: open(folder), now: { now }).add("Hello", at: now)
        let later = now.addingTimeInterval(SaidList.maxAge + 1)
        expect(SaidList(database: open(folder), now: { later }).lines.isEmpty)
        let rows = try open(folder).query("SELECT count(*) FROM talk_line")
        expectEqual(rows.first?.first, .int(0))
    }

    test("clearing the Talk history empties the list and the table") {
        let folder = folder()
        let said = SaidList(database: open(folder), now: { now })
        said.add("Hello", at: now)
        said.clear()
        expect(said.lines.isEmpty)
        expect(said.currentID == nil)
        expect(SaidList(database: open(folder), now: { now }).lines.isEmpty)
    }

    test("the predictions get only the lines of the last hour, oldest first") {
        let said = SaidList(database: memoryDatabase(), now: { now })
        said.add("This morning", at: now.addingTimeInterval(-3 * 3600))
        said.add("A while ago", at: now.addingTimeInterval(-50 * 60))
        said.add("Just now", at: now)
        expectEqual(said.recentTexts, ["A while ago", "Just now"])
    }
}
