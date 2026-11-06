import Combine
import Foundation

/// Turns a pointer going down, moving and coming up on a control into presses.
///
/// A tap presses once, on release inside the control. A held repeating key
/// presses once after `Metrics.holdDuration`, then once every
/// `Metrics.keyRepeatInterval`, and the release that ends the hold presses
/// nothing more. When the pointer leaves the control, the press ends: the
/// repeat stops and the release sends nothing.
@MainActor
public final class PressTracker {
    /// Runs `fire` once after a delay. Cancelling the result stops it.
    public typealias Schedule = @MainActor (
        _ delay: TimeInterval, _ fire: @escaping @MainActor () -> Void
    ) -> AnyCancellable

    private enum Phase {
        case idle
        case pressed
        case left
    }

    private var phase = Phase.idle
    private var hasRepeated = false
    private let schedule: Schedule
    private var pending: AnyCancellable?

    public var isPressed: Bool { phase == .pressed }

    public init(schedule: @escaping Schedule = PressTracker.afterDelay) {
        self.schedule = schedule
    }

    /// Returns false when the pointer is already down. A drag reports many
    /// changes for one press.
    @discardableResult
    public func down(repeats: Bool, press: @escaping @MainActor () -> Void) -> Bool {
        guard phase == .idle else { return false }
        phase = .pressed
        hasRepeated = false
        if repeats {
            pending = schedule(Metrics.holdDuration) { [weak self] in self?.repeatPress(press) }
        }
        return true
    }

    public func moved(inside: Bool) {
        guard phase == .pressed, !inside else { return }
        phase = .left
        pending = nil
    }

    public func up(inside: Bool, press: @MainActor () -> Void) {
        let taps = phase == .pressed && inside && !hasRepeated
        cancel()
        if taps { press() }
    }

    /// Ends the press without pressing. Use it when the control goes away
    /// while the pointer is still down.
    public func cancel() {
        phase = .idle
        pending = nil
    }

    private func repeatPress(_ press: @escaping @MainActor () -> Void) {
        hasRepeated = true
        press()
        pending = schedule(Metrics.keyRepeatInterval) { [weak self] in self?.repeatPress(press) }
    }

    public static func afterDelay(
        _ delay: TimeInterval, _ fire: @escaping @MainActor () -> Void
    ) -> AnyCancellable {
        let task = Task { @MainActor in
            try? await Task.sleep(for: .seconds(delay))
            guard !Task.isCancelled else { return }
            fire()
        }
        return AnyCancellable { task.cancel() }
    }
}
