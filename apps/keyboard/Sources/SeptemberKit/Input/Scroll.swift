import CoreGraphics
import Foundation

/// The way that a scroll button moves the content under the pointer.
public enum ScrollDirection: String, Sendable, Hashable, CaseIterable {
    case up, down, left, right

    /// The pixels of one step, as the vertical and the horizontal wheel of a
    /// scroll event. A positive vertical value moves the content down, so
    /// the view shows what is above.
    public var wheelDelta: (vertical: Int32, horizontal: Int32) {
        switch self {
        case .up: (Self.step, 0)
        case .down: (-Self.step, 0)
        case .left: (0, Self.step)
        case .right: (0, -Self.step)
        }
    }

    /// The pixels of one step. A held button repeats the step at the key
    /// repeat rate of macOS.
    static let step: Int32 = 40
}

/// Finds the place where the pointer rests outside the keyboard. A scroll
/// button scrolls that place, as the scroll menu of Dwell of macOS does.
///
/// A pointer that passes by on its way to the keyboard does not rest. It
/// rests when it stays still for `restDelay`, or at once where the user
/// clicks.
@MainActor
public final class PointerRestTracker {
    /// The time that the pointer stays still before it rests.
    public static let restDelay: TimeInterval = 0.4

    private let scheduler: any DelayScheduler
    private let onRest: (CGPoint) -> Void
    private var pending: (any ScheduledWork)?

    public init(scheduler: any DelayScheduler = MainQueueScheduler(), onRest: @escaping (CGPoint) -> Void) {
        self.scheduler = scheduler
        self.onRest = onRest
    }

    /// The pointer moved outside the keyboard, to `point` in screen
    /// coordinates from the top left.
    public func moved(to point: CGPoint) {
        pending?.cancel()
        pending = scheduler.schedule(after: Self.restDelay) { [weak self] in
            self?.pending = nil
            self?.onRest(point)
        }
    }

    /// The user clicked outside the keyboard, at `point`.
    public func clicked(at point: CGPoint) {
        pending?.cancel()
        pending = nil
        onRest(point)
    }
}
