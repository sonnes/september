import Combine
import Foundation

/// One line that the user said in Talk mode.
public typealias SaidLine = TextLogEntry

/// The lines that the user said in Talk mode, newest first.
///
/// The list keeps its lines in the `talk_line` table of the keyboard
/// database, for `maxAge` and up to `lineLimit` lines. The Talk history is
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

    @Published public private(set) var lines: [SaidLine] = []
    /// The line that the keyboard spoke last.
    @Published public private(set) var currentID: SaidLine.ID?

    private let log: TextLog
    private let now: () -> Date

    public init(database: KeyboardDatabase, now: @escaping () -> Date = Date.init) {
        log = TextLog(
            database: database, table: "talk_line", dateColumn: "said_at", limit: Self.lineLimit, maxAge: Self.maxAge)
        self.now = now
        lines = log.entries(at: now())
    }

    public func add(_ text: String, at date: Date? = nil) {
        let line = SaidLine(text: text, date: date ?? now())
        log.add(line)
        currentID = line.id
        lines = log.entries(at: now())
    }

    /// A replay marks the line but does not move it. The rows stay in place
    /// for a user who points with a switch or a head pointer.
    public func markCurrent(_ id: SaidLine.ID) {
        currentID = id
    }

    public func clear() {
        lines = []
        currentID = nil
        log.clear()
    }

    /// The texts of the lines of the last `contextWindow`, oldest first, for
    /// the sentence predictions of Talk mode.
    public var recentTexts: [String] {
        let start = now().addingTimeInterval(-Self.contextWindow)
        return lines.filter { $0.date >= start }.reversed().map(\.text)
    }
}
