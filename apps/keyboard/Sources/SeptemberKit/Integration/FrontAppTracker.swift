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

/// Decides which app the keyboard types into: another app, or the Write
/// window of the keyboard itself.
///
/// The Write window belongs to the process of the keyboard, so the app
/// activation of macOS cannot tell it from the Settings window. The Write
/// window reports when it becomes key, and the tracker matches each app on
/// its process ID, because two windows of one app have one bundle ID.
public struct FrontAppTracker: Sendable {
    public enum Switch: Equatable, Sendable {
        /// The Write window is in front.
        case write
        /// Another app is in front, or no app.
        case app(FrontApp?)
    }

    private enum Front: Equatable {
        case write
        case app(Int32?)
    }

    private let ownPID: Int32
    private var front: Front?

    public init(ownPID: Int32) {
        self.ownPID = ownPID
    }

    /// macOS brought an app to the front. The keyboard itself is not an app
    /// to type into: the Write window reports itself.
    public mutating func appActivated(_ app: FrontApp?) -> Switch? {
        guard app?.pid != ownPID else { return nil }
        return move(to: .app(app?.pid), app: app)
    }

    /// The Write window became key, or stopped being key. When it stops, the
    /// app in front is read again.
    public mutating func writeKeyChanged(_ isKey: Bool, front app: FrontApp?) -> Switch? {
        if isKey { return move(to: .write, app: nil) }
        guard app?.pid != ownPID else { return nil }
        return move(to: .app(app?.pid), app: app)
    }

    private mutating func move(to next: Front, app: FrontApp?) -> Switch? {
        guard next != front else { return nil }
        front = next
        return next == .write ? .write : .app(app)
    }
}
