import Combine
import Foundation

/// One line that the user said in Talk mode.
///
/// The text is private. Its descriptions show only the length, so a log or a
/// test failure never prints it.
public struct SaidLine: Identifiable, Equatable, Sendable, Codable {
    public let id: UUID
    public let text: String
    public let date: Date

    public init(id: UUID = UUID(), text: String, date: Date) {
        self.id = id
        self.text = text
        self.date = date
    }

    /// The time since the line was said, in the short form of the list:
    /// "now", "2 min", "1 h".
    public func age(at now: Date) -> String {
        shortAge(since: date, at: now)
    }
}

/// The time since `date`, in the short form of the lists: "now", "2 min",
/// "1 h".
func shortAge(since date: Date, at now: Date) -> String {
    let minutes = Int(now.timeIntervalSince(date) / 60)
    if minutes < 1 { return "now" }
    if minutes < 60 { return "\(minutes) min" }
    return "\(minutes / 60) h"
}

extension SaidLine: CustomStringConvertible, CustomDebugStringConvertible {
    public var description: String { "SaidLine(\(text.count) characters)" }
    public var debugDescription: String { description }
}

/// The lines that the user said in Talk mode, newest first.
///
/// The list keeps its lines in the `talk_line` table of the keyboard
/// database, for 30 days and up to `lineLimit` lines. The Talk history is
/// separate from every other store of the keyboard. With no database file,
/// the list stays in memory.
@MainActor
public final class SaidList: ObservableObject {
    /// The most lines that the history keeps.
    public static let lineLimit = 1000
    /// The longest time that the history keeps a line.
    public static let maxAge: TimeInterval = 30 * 24 * 3600
    /// The lines that the sentence predictions get are this new or newer.
    public static let contextWindow: TimeInterval = 3600

    /// The JSON file of the older versions of the keyboard:
    /// `~/Library/Application Support/September Keyboard/talk-history.json`.
    public static var jsonURL: URL {
        URL.applicationSupportDirectory
            .appendingPathComponent("September Keyboard", isDirectory: true)
            .appendingPathComponent("talk-history.json")
    }

    @Published public private(set) var lines: [SaidLine] = []
    /// The line that the keyboard spoke last.
    @Published public private(set) var currentID: SaidLine.ID?

    private let database: KeyboardDatabase
    private let now: () -> Date

    /// Opens the list on `database`. If `jsonURL` names a JSON file of an
    /// older version, its lines move into the database, and the file is
    /// removed.
    public init(
        database: KeyboardDatabase = try! KeyboardDatabase(path: ":memory:"), importing jsonURL: URL? = nil,
        now: @escaping () -> Date = Date.init
    ) {
        self.database = database
        self.now = now
        if let jsonURL {
            database.importJSON([SaidLine].self, from: jsonURL) { lines in
                for line in lines {
                    try database.execute(
                        "INSERT OR IGNORE INTO talk_line (id, text, said_at) VALUES (?, ?, ?)",
                        [.text(line.id.uuidString), .text(line.text), .double(line.date.timeIntervalSince1970)])
                }
            }
        }
        trim()
        lines = load()
    }

    public func add(_ text: String, at date: Date? = nil) {
        let line = SaidLine(text: text, date: date ?? now())
        lines.insert(line, at: 0)
        currentID = line.id
        try? database.execute(
            "INSERT INTO talk_line (id, text, said_at) VALUES (?, ?, ?)",
            [.text(line.id.uuidString), .text(line.text), .double(line.date.timeIntervalSince1970)])
        trim()
        let start = now().addingTimeInterval(-Self.maxAge)
        lines = Array(lines.filter { $0.date >= start }.prefix(Self.lineLimit))
    }

    /// A replay marks the line but does not move it. The rows stay in place
    /// for a user who points with a switch or a head pointer.
    public func markCurrent(_ id: SaidLine.ID) {
        currentID = id
    }

    /// Removes every line.
    public func clear() {
        lines = []
        currentID = nil
        try? database.execute("DELETE FROM talk_line")
    }

    /// The texts of the lines of the last `contextWindow`, oldest first, for
    /// the sentence predictions of Talk mode.
    public var recentTexts: [String] {
        let start = now().addingTimeInterval(-Self.contextWindow)
        return lines.filter { $0.date >= start }.reversed().map(\.text)
    }

    /// Removes the lines older than `maxAge` and the lines after the newest
    /// `lineLimit`.
    private func trim() {
        let start = now().addingTimeInterval(-Self.maxAge).timeIntervalSince1970
        try? database.transaction {
            try database.execute("DELETE FROM talk_line WHERE said_at < ?", [.double(start)])
            try database.execute(
                """
                DELETE FROM talk_line WHERE id IN
                  (SELECT id FROM talk_line ORDER BY said_at DESC LIMIT -1 OFFSET ?)
                """,
                [.int(Int64(Self.lineLimit))])
        }
    }

    private func load() -> [SaidLine] {
        let rows =
            (try? database.query(
                "SELECT id, text, said_at FROM talk_line ORDER BY said_at DESC LIMIT ?",
                [.int(Int64(Self.lineLimit))])) ?? []
        return rows.compactMap { row in
            guard let id = row[0].text.flatMap(UUID.init(uuidString:)), let text = row[1].text,
                let at = row[2].double
            else { return nil }
            return SaidLine(id: id, text: text, date: Date(timeIntervalSince1970: at))
        }
    }
}
