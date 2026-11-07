import Foundation
import SeptemberKit

@MainActor
func talkHistoryTests() {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    func file() -> URL { temporaryDirectory().appendingPathComponent("talk-history.json") }

    test("the Talk history keeps its lines across launches") {
        let url = file()
        let said = SaidList(fileURL: url, now: { now })
        said.add("Good morning", at: now.addingTimeInterval(-60))
        said.add("Can you open the window?", at: now)
        let again = SaidList(fileURL: url, now: { now })
        expectEqual(again.lines.map(\.text), ["Can you open the window?", "Good morning"])
        expectEqual(again.lines.map(\.id), said.lines.map(\.id))
        expectEqual(again.lines.map(\.date), said.lines.map(\.date))
    }

    test("the Talk history drops lines older than 30 days and keeps the newest 1,000") {
        let url = file()
        let said = SaidList(fileURL: url, now: { now })
        said.add("Last month", at: now.addingTimeInterval(-31 * 24 * 3600))
        for index in 0..<1005 { said.add("Line \(index)", at: now.addingTimeInterval(Double(index - 1005))) }
        expectEqual(said.lines.count, SaidList.lineLimit)
        expectEqual(said.lines.first?.text, "Line 1004")
        expect(!said.lines.contains { $0.text == "Last month" })
        expectEqual(SaidList(fileURL: url, now: { now }).lines.count, SaidList.lineLimit)
    }

    test("clearing the Talk history empties the list and the file") {
        let url = file()
        let said = SaidList(fileURL: url, now: { now })
        said.add("Hello", at: now)
        said.clear()
        expect(said.lines.isEmpty)
        expect(said.currentID == nil)
        expect(SaidList(fileURL: url, now: { now }).lines.isEmpty)
    }

    test("a broken Talk history file is moved aside, not overwritten") {
        let url = file()
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("not json".utf8).write(to: url)
        let said = SaidList(fileURL: url, now: { now })
        expect(said.lines.isEmpty)
        let aside = url.deletingPathExtension().appendingPathExtension("broken.json")
        expectEqual(try String(contentsOf: aside, encoding: .utf8), "not json")
        said.add("Hello", at: now)
        expectEqual(SaidList(fileURL: url, now: { now }).lines.map(\.text), ["Hello"])
    }

    test("the Talk history file is readable only by the user") {
        let url = file()
        SaidList(fileURL: url, now: { now }).add("Hello", at: now)
        let permissions = try FileManager.default.attributesOfItem(atPath: url.path)[.posixPermissions] as? Int
        expectEqual(permissions, 0o600)
    }

    test("the predictions get only the lines of the last hour, oldest first") {
        let said = SaidList(now: { now })
        said.add("This morning", at: now.addingTimeInterval(-3 * 3600))
        said.add("A while ago", at: now.addingTimeInterval(-50 * 60))
        said.add("Just now", at: now)
        expectEqual(said.recentTexts, ["A while ago", "Just now"])
    }
}
