import Foundation

/// Turns a pointer going down, moving, and coming up on a control into one
/// press, for a control that acts when the button goes up.
///
/// The control acts when the pointer comes up inside it. When the pointer
/// leaves the control, the press ends, and the release sends nothing. A key
/// that acts when the button goes down uses `KeyPresser` instead.
@MainActor
public final class PressTracker {
    private enum Phase {
        case idle
        case pressed
        case left
    }

    private var phase = Phase.idle

    public var isPressed: Bool { phase == .pressed }

    public init() {}

    /// Returns false when the pointer is already down. A drag reports many
    /// changes for one press.
    @discardableResult
    public func down() -> Bool {
        guard phase == .idle else { return false }
        phase = .pressed
        return true
    }

    public func moved(inside: Bool) {
        guard phase == .pressed, !inside else { return }
        phase = .left
    }

    public func up(inside: Bool, press: @MainActor () -> Void) {
        let taps = phase == .pressed && inside
        cancel()
        if taps { press() }
    }

    /// Ends the press without pressing. Use it when the control goes away
    /// while the pointer is still down.
    public func cancel() {
        phase = .idle
    }
}
