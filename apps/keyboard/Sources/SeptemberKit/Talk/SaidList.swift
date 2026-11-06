import Combine
import Foundation

/// One line that the user said in Talk mode.
///
/// The text is private. Its descriptions show only the length, so a log or a
/// test failure never prints it.
public struct SaidLine: Identifiable, Equatable, Sendable {
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
        let minutes = Int(now.timeIntervalSince(date) / 60)
        if minutes < 1 { return "now" }
        if minutes < 60 { return "\(minutes) min" }
        return "\(minutes / 60) h"
    }
}

extension SaidLine: CustomStringConvertible, CustomDebugStringConvertible {
    public var description: String { "SaidLine(\(text.count) characters)" }
    public var debugDescription: String { description }
}

/// The lines of this session, newest first. The list stays in memory and is
/// never saved to disk.
@MainActor
public final class SaidList: ObservableObject {
    @Published public private(set) var lines: [SaidLine] = []
    /// The line that the keyboard spoke last.
    @Published public private(set) var currentID: SaidLine.ID?

    public init() {}

    public func add(_ text: String, at date: Date = Date()) {
        let line = SaidLine(text: text, date: date)
        lines.insert(line, at: 0)
        currentID = line.id
    }

    /// A replay marks the line but does not move it. The rows stay in place
    /// for a user who points with a switch or a head pointer.
    public func markCurrent(_ id: SaidLine.ID) {
        currentID = id
    }
}
