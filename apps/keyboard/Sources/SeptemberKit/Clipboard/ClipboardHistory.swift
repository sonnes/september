import Combine
import Foundation

/// A text that the user copied.
public typealias ClipboardItem = TextLogEntry

extension TextLogEntry {
    /// The text on one line, with a return mark at each line break.
    public var preview: String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .joined(separator: " ↵ ")
    }
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

    private static let enabledKey = "clipboardHistoryEnabled"

    @Published public private(set) var items: [ClipboardItem] = []
    @Published public var isEnabled: Bool {
        didSet {
            guard isEnabled != oldValue else { return }
            defaults.set(isEnabled, forKey: Self.enabledKey)
            if !isEnabled { clear() }
        }
    }

    private let log: TextLog
    private let defaults: UserDefaults
    private let now: () -> Date

    /// Opens the history on `database`.
    public init(
        database: KeyboardDatabase, defaults: UserDefaults = .standard, now: @escaping () -> Date = Date.init
    ) {
        log = TextLog(
            database: database, table: "clip", dateColumn: "copied_at", limit: Self.itemLimit, maxAge: Self.maxAge)
        self.defaults = defaults
        self.now = now
        isEnabled = defaults.object(forKey: Self.enabledKey) as? Bool ?? true
        if isEnabled {
            items = log.entries(at: now())
        } else {
            clear()
        }
    }

    /// Adds a copy as the newest text. A text that is already in the history
    /// moves to the newest place. An empty or blank text does nothing.
    public func add(_ text: String) {
        guard isEnabled, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        // The text of a clip is unique, so the copy replaces the row with the
        // same text and gets a new ID and a new date.
        log.add(ClipboardItem(text: text, date: now()))
        items = log.entries(at: now())
    }

    /// Removes every text.
    public func clear() {
        items = []
        log.clear()
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
}
