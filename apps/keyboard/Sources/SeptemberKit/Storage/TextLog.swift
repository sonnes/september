import Foundation

/// One text in a `TextLog`, with its ID and its date.
///
/// The text is private. Its descriptions show only the length, so a log or a
/// test failure never prints it.
public struct TextLogEntry: Identifiable, Equatable, Sendable, Codable {
    public let id: UUID
    public let text: String
    public let date: Date

    public init(id: UUID = UUID(), text: String, date: Date) {
        self.id = id
        self.text = text
        self.date = date
    }

    /// The time since the date of the entry, in the short form of the lists:
    /// "now", "2 min", "1 h".
    public func age(at now: Date) -> String {
        let minutes = Int(now.timeIntervalSince(date) / 60)
        if minutes < 1 { return "now" }
        if minutes < 60 { return "\(minutes) min" }
        return "\(minutes / 60) h"
    }
}

extension TextLogEntry: CustomStringConvertible, CustomDebugStringConvertible {
    public var description: String { "TextLogEntry(\(text.count) characters)" }
    public var debugDescription: String { description }
}

/// A table of the keyboard database that keeps dated texts, newest first.
///
/// The table has the columns `id`, `text`, and `dateColumn`. The log keeps
/// a text for `maxAge` and keeps the newest `limit` texts. The SQL of
/// `entries(at:)` applies this rule.
struct TextLog {
    let database: KeyboardDatabase
    let table: String
    let dateColumn: String
    let limit: Int
    let maxAge: TimeInterval

    /// Adds `entry`. If the table has a row with the same unique key, the new
    /// row replaces it.
    func add(_ entry: TextLogEntry) {
        try? database.execute(
            "INSERT OR REPLACE INTO \(table) (id, text, \(dateColumn)) VALUES (?, ?, ?)",
            [.text(entry.id.uuidString), .text(entry.text), .double(entry.date.timeIntervalSince1970)])
    }

    /// Removes the texts older than `maxAge` and the texts after the newest
    /// `limit`. Then gives the texts that stay, newest first.
    func entries(at now: Date) -> [TextLogEntry] {
        let start = now.addingTimeInterval(-maxAge).timeIntervalSince1970
        try? database.transaction {
            try database.execute("DELETE FROM \(table) WHERE \(dateColumn) < ?", [.double(start)])
            try database.execute(
                """
                DELETE FROM \(table) WHERE rowid IN
                  (SELECT rowid FROM \(table) ORDER BY \(dateColumn) DESC, rowid DESC LIMIT -1 OFFSET ?)
                """,
                [.int(Int64(limit))])
        }
        let rows =
            (try? database.query(
                "SELECT id, text, \(dateColumn) FROM \(table) ORDER BY \(dateColumn) DESC, rowid DESC LIMIT ?",
                [.int(Int64(limit))])) ?? []
        return rows.compactMap { row in
            guard let id = row[0].text.flatMap(UUID.init(uuidString:)), let text = row[1].text,
                let at = row[2].double
            else { return nil }
            return TextLogEntry(id: id, text: text, date: Date(timeIntervalSince1970: at))
        }
    }

    /// Removes every text.
    func clear() {
        try? database.execute("DELETE FROM \(table)")
    }
}
