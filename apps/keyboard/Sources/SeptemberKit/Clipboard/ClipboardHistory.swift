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
/// With a file, the history keeps its texts across launches, for 7 days and
/// up to `itemLimit` texts. The file is readable only by the user. A file
/// that does not decode is moved aside to `<name>.broken.json`, and the
/// history starts empty. With no file, the history stays in memory.
///
/// The history is on by default. When the user turns it off, the history
/// removes every text and the file, and it keeps no new copies.
@MainActor
public final class ClipboardHistory: ObservableObject {
    /// The most texts that the history keeps.
    public static let itemLimit = 200
    /// The longest time that the history keeps a text.
    public static let maxAge: TimeInterval = 7 * 24 * 3600
    /// The texts on one page of the history view.
    public static let pageSize = 6

    /// `~/Library/Application Support/September Keyboard/clipboard-history.json`.
    public static var defaultURL: URL {
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

    private let fileURL: URL?
    private let defaults: UserDefaults
    private let now: () -> Date

    public init(fileURL: URL? = nil, defaults: UserDefaults = .standard, now: @escaping () -> Date = Date.init) {
        self.fileURL = fileURL
        self.defaults = defaults
        self.now = now
        isEnabled = defaults.object(forKey: Self.enabledKey) as? Bool ?? true
        items = isEnabled ? load() : []
    }

    /// Adds a copy as the newest text. A text that is already in the history
    /// moves to the newest place. An empty or blank text does nothing.
    public func add(_ text: String) {
        guard isEnabled, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        items.removeAll { $0.text == text }
        items.insert(ClipboardItem(text: text, date: now()), at: 0)
        trim()
        save()
    }

    /// Removes every text, and the file.
    public func clear() {
        items = []
        if let fileURL { try? FileManager.default.removeItem(at: fileURL) }
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

    private func trim() {
        let start = now().addingTimeInterval(-Self.maxAge)
        items = Array(items.filter { $0.date >= start }.prefix(Self.itemLimit))
    }

    private func load() -> [ClipboardItem] {
        guard let fileURL, let data = try? Data(contentsOf: fileURL) else { return [] }
        do {
            let start = now().addingTimeInterval(-Self.maxAge)
            return Array(
                try JSONDecoder().decode([ClipboardItem].self, from: data)
                    .filter { $0.date >= start }
                    .prefix(Self.itemLimit))
        } catch {
            let aside = fileURL.deletingPathExtension().appendingPathExtension("broken.json")
            try? FileManager.default.removeItem(at: aside)
            try? FileManager.default.moveItem(at: fileURL, to: aside)
            return []
        }
    }

    private func save() {
        guard let fileURL else { return }
        do {
            try FileManager.default.createDirectory(
                at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(items).write(to: fileURL, options: .atomic)
            try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL.path)
        } catch {
            // The history stays in memory. The error can name the file, and
            // never holds the text.
        }
    }
}
