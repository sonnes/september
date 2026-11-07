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
/// The Talk history is separate from every other store of the keyboard. With
/// a file, the list keeps its lines across launches, for 30 days and up to
/// `lineLimit` lines. The file is readable only by the user. A file that does
/// not decode is moved aside to `<name>.broken.json`, and the list starts
/// empty. With no file, the list stays in memory.
@MainActor
public final class SaidList: ObservableObject {
    /// The most lines that the history keeps.
    public static let lineLimit = 1000
    /// The longest time that the history keeps a line.
    public static let maxAge: TimeInterval = 30 * 24 * 3600
    /// The lines that the sentence predictions get are this new or newer.
    public static let contextWindow: TimeInterval = 3600

    /// `~/Library/Application Support/September Keyboard/talk-history.json`.
    public static var defaultURL: URL {
        URL.applicationSupportDirectory
            .appendingPathComponent("September Keyboard", isDirectory: true)
            .appendingPathComponent("talk-history.json")
    }

    @Published public private(set) var lines: [SaidLine] = []
    /// The line that the keyboard spoke last.
    @Published public private(set) var currentID: SaidLine.ID?

    private let fileURL: URL?
    private let now: () -> Date

    public init(fileURL: URL? = nil, now: @escaping () -> Date = Date.init) {
        self.fileURL = fileURL
        self.now = now
        lines = load()
    }

    public func add(_ text: String, at date: Date? = nil) {
        let line = SaidLine(text: text, date: date ?? now())
        lines.insert(line, at: 0)
        currentID = line.id
        trim()
        save()
    }

    /// A replay marks the line but does not move it. The rows stay in place
    /// for a user who points with a switch or a head pointer.
    public func markCurrent(_ id: SaidLine.ID) {
        currentID = id
    }

    /// Removes every line, and the file.
    public func clear() {
        lines = []
        currentID = nil
        if let fileURL { try? FileManager.default.removeItem(at: fileURL) }
    }

    /// The texts of the lines of the last `contextWindow`, oldest first, for
    /// the sentence predictions of Talk mode.
    public var recentTexts: [String] {
        let start = now().addingTimeInterval(-Self.contextWindow)
        return lines.filter { $0.date >= start }.reversed().map(\.text)
    }

    private func trim() {
        let start = now().addingTimeInterval(-Self.maxAge)
        lines = Array(lines.filter { $0.date >= start }.prefix(Self.lineLimit))
    }

    private func load() -> [SaidLine] {
        guard let fileURL, let data = try? Data(contentsOf: fileURL) else { return [] }
        do {
            let start = now().addingTimeInterval(-Self.maxAge)
            return Array(
                try JSONDecoder().decode([SaidLine].self, from: data)
                    .filter { $0.date >= start }
                    .prefix(Self.lineLimit))
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
            try JSONEncoder().encode(lines).write(to: fileURL, options: .atomic)
            try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL.path)
        } catch {
            // The history stays in memory. The error can name the file, and
            // never holds the text.
        }
    }
}
