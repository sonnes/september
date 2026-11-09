import Combine
import Foundation

/// A text that the user copied.
///
/// The text is private. Its descriptions show only the length, so a log or a
/// test failure never prints it.
public struct ClipboardItem: Identifiable, Equatable, Sendable, Codable {
    public let id: UUID
    public let text: String
    public let date: Date

    public init(id: UUID = UUID(), text: String, date: Date) {
        self.id = id
        self.text = text
        self.date = date
    }

    /// The time since the copy, in the short form of the list: "now",
    /// "2 min", "1 h".
    public func age(at now: Date) -> String {
        shortAge(since: date, at: now)
    }

    /// The text on one line, with a return mark at each line break.
    public var preview: String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: " ↵ ")
    }
}

extension ClipboardItem: CustomStringConvertible, CustomDebugStringConvertible {
    public var description: String { "ClipboardItem(\(text.count) characters)" }
    public var debugDescription: String { description }
}

/// The texts that the user copied, newest first.
///
/// The history keeps its texts in the `clip` table of the keyboard database,
/// for 7 days and up to `itemLimit` texts. With no database file, the
/// history stays in memory.
///
/// The history is on by default. When the user turns it off, the history
/// removes every text, and it keeps no new copies.
@MainActor
public final class ClipboardHistory: ObservableObject {
    /// The most texts that the history keeps.
    public static let itemLimit = 200
    /// The longest time that the history keeps a text.
    public static let maxAge: TimeInterval = 7 * 24 * 3600
    /// The texts on one page of the history view.
    public static let pageSize = 6

    /// The JSON file of the older versions of the keyboard:
    /// `~/Library/Application Support/September Keyboard/clipboard-history.json`.
    public static var jsonURL: URL {
        URL.applicationSupportDirectory
            .appendingPathComponent("September Keyboard", isDirectory: true)
            .appendingPathComponent("clipboard-history.json")
    }

    private static let enabledKey = "clipboardHistoryEnabled"

    @Published public private(set) var items: [ClipboardItem] = []
    @Published public var isEnabled: Bool {
        didSet {
            guard isEnabled != oldValue else { return }
            defaults.set(isEnabled, forKey: Self.enabledKey)
            if !isEnabled { clear() }
        }
    }

    private let database: KeyboardDatabase
    private let defaults: UserDefaults
    private let now: () -> Date

    /// Opens the history on `database`. If `jsonURL` names a JSON file of an
    /// older version, its texts move into the database, and the file is
    /// removed.
    public init(
        database: KeyboardDatabase = try! KeyboardDatabase(path: ":memory:"), importing jsonURL: URL? = nil,
        defaults: UserDefaults = .standard, now: @escaping () -> Date = Date.init
    ) {
        self.database = database
        self.defaults = defaults
        self.now = now
        isEnabled = defaults.object(forKey: Self.enabledKey) as? Bool ?? true
        if let jsonURL {
            database.importJSON([ClipboardItem].self, from: jsonURL) { items in
                for item in items {
                    try database.execute(
                        "INSERT OR IGNORE INTO clip (id, text, copied_at) VALUES (?, ?, ?)",
                        [.text(item.id.uuidString), .text(item.text), .double(item.date.timeIntervalSince1970)])
                }
            }
        }
        if isEnabled {
            trim()
            items = load()
        } else {
            clear()
        }
    }

    /// Adds a copy as the newest text. A text that is already in the history
    /// moves to the newest place. An empty or blank text does nothing.
    public func add(_ text: String) {
        guard isEnabled, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let item = ClipboardItem(text: text, date: now())
        items.removeAll { $0.text == text }
        items.insert(item, at: 0)
        // REPLACE removes the row with the same text, so the copy gets a new
        // ID and a new date, as in `items`.
        try? database.execute(
            "INSERT OR REPLACE INTO clip (id, text, copied_at) VALUES (?, ?, ?)",
            [.text(item.id.uuidString), .text(item.text), .double(item.date.timeIntervalSince1970)])
        trim()
        let start = now().addingTimeInterval(-Self.maxAge)
        items = Array(items.filter { $0.date >= start }.prefix(Self.itemLimit))
    }

    /// Removes every text.
    public func clear() {
        items = []
        try? database.execute("DELETE FROM clip")
    }

    /// The number of pages. An empty history has one page.
    public var pageCount: Int {
        max(1, (items.count + Self.pageSize - 1) / Self.pageSize)
    }

    /// The texts of a page, newest first. Page 0 holds the newest texts.
    public func page(_ index: Int) -> [ClipboardItem] {
        let start = index * Self.pageSize
        guard index >= 0, start < items.count else { return [] }
        return Array(items[start..<min(start + Self.pageSize, items.count)])
    }

    /// Removes the texts older than `maxAge` and the texts after the newest
    /// `itemLimit`.
    private func trim() {
        let start = now().addingTimeInterval(-Self.maxAge).timeIntervalSince1970
        try? database.transaction {
            try database.execute("DELETE FROM clip WHERE copied_at < ?", [.double(start)])
            try database.execute(
                """
                DELETE FROM clip WHERE rowid IN
                  (SELECT rowid FROM clip ORDER BY copied_at DESC, rowid DESC LIMIT -1 OFFSET ?)
                """,
                [.int(Int64(Self.itemLimit))])
        }
    }

    private func load() -> [ClipboardItem] {
        let rows =
            (try? database.query(
                "SELECT id, text, copied_at FROM clip ORDER BY copied_at DESC, rowid DESC LIMIT ?",
                [.int(Int64(Self.itemLimit))])) ?? []
        return rows.compactMap { row in
            guard let id = row[0].text.flatMap(UUID.init(uuidString:)), let text = row[1].text,
                let at = row[2].double
            else { return nil }
            return ClipboardItem(id: id, text: text, date: Date(timeIntervalSince1970: at))
        }
    }
}
