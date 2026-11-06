import Combine
import Foundation

/// Repeats a held key. The first repeat comes after `Metrics.holdDuration`,
/// then one every `Metrics.keyRepeatInterval` until `stop`.
@MainActor
public final class KeyRepeater {
    /// Runs `fire` once after a delay. Cancelling the result stops it.
    public typealias Schedule = @MainActor (
        _ delay: TimeInterval, _ fire: @escaping @MainActor () -> Void
    ) -> AnyCancellable

    private let schedule: Schedule
    private var pending: AnyCancellable?

    public init(schedule: @escaping Schedule = KeyRepeater.afterDelay) {
        self.schedule = schedule
    }

    public func start(_ press: @escaping @MainActor () -> Void) {
        pending = schedule(Metrics.holdDuration) { [weak self] in self?.repeatPress(press) }
    }

    public func stop() {
        pending = nil
    }

    private func repeatPress(_ press: @escaping @MainActor () -> Void) {
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
