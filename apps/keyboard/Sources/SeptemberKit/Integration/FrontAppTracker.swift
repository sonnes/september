/// An app that came to the front, as far as the shell can tell.
public struct FrontApp: Equatable, Sendable {
    public let pid: Int32
    public let name: String?
    public let bundleID: String?

    public init(pid: Int32, name: String?, bundleID: String?) {
        self.pid = pid
        self.name = name
        self.bundleID = bundleID
    }
}

/// What the keyboard types into: another app, or Write with its panel.
public enum FrontTarget: Equatable, Sendable {
    case app(FrontApp)
    case write(WritePanel)

    /// The name of Write in the input bar.
    public static let writeName = "Write"

    public var isWrite: Bool {
        if case .write = self { return true }
        return false
    }

    /// The name of the app in front, or nil when the app gives none.
    public var name: String? {
        switch self {
        case .app(let app): app.name
        case .write: Self.writeName
        }
    }
}

/// Decides which app the keyboard types into: another app, or the Write
/// window of the keyboard itself.
///
/// The Write window belongs to the process of the keyboard, so the app
/// activation of macOS cannot tell it from the Settings window. The Write
/// window reports when it becomes key, and the tracker matches each app on
/// its process ID, because two windows of one app have one bundle ID.
public struct FrontAppTracker: Sendable {
    private enum Front: Equatable {
        case write
        case app(Int32)
    }

    private let ownPID: Int32
    private var front: Front?

    public init(ownPID: Int32) {
        self.ownPID = ownPID
    }

    /// macOS brought an app to the front. The keyboard itself is not an app
    /// to type into: the Write window reports itself. Nil when nothing
    /// changed.
    public mutating func appActivated(_ app: FrontApp?) -> FrontTarget? {
        guard let app, app.pid != ownPID else { return nil }
        return move(to: .app(app.pid), target: .app(app))
    }

    /// The Write window became key, or stopped being key. When it stops, the
    /// app in front is read again. Nil when nothing changed.
    public mutating func writeKeyChanged(_ isKey: Bool, panel: WritePanel, front app: FrontApp?) -> FrontTarget? {
        if isKey { return move(to: .write, target: .write(panel)) }
        return appActivated(app)
    }

    private mutating func move(to next: Front, target: FrontTarget) -> FrontTarget? {
        guard next != front else { return nil }
        front = next
        return target
    }
}
