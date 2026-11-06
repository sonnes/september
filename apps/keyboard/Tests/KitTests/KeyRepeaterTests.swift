import Combine
import Foundation
import SeptemberKit
import Testing

/// A clock the test advances by hand. It runs each scheduled fire on request.
@MainActor
private final class ManualClock {
    private(set) var delays: [TimeInterval] = []
    private var next: (id: Int, fire: @MainActor () -> Void)?

    func schedule(_ delay: TimeInterval, _ fire: @escaping @MainActor () -> Void) -> AnyCancellable {
        delays.append(delay)
        let id = delays.count
        next = (id, fire)
        return AnyCancellable { [weak self] in
            MainActor.assumeIsolated {
                if self?.next?.id == id { self?.next = nil }
            }
        }
    }

    func fire() {
        let fire = next?.fire
        next = nil
        fire?()
    }
}

@MainActor
struct KeyRepeaterTests {
    @Test func `a held key waits for the hold delay before it repeats`() {
        let clock = ManualClock()
        let repeater = KeyRepeater(schedule: clock.schedule)
        var presses = 0
        repeater.start { presses += 1 }

        #expect(presses == 0, "a press shorter than the hold delay sends nothing extra")
        #expect(clock.delays == [Metrics.holdDuration])

        clock.fire()
        clock.fire()
        #expect(presses == 2)
        #expect(clock.delays == [Metrics.holdDuration, Metrics.keyRepeatInterval, Metrics.keyRepeatInterval])
    }

    @Test func `releasing the key stops the repeat`() {
        let clock = ManualClock()
        let repeater = KeyRepeater(schedule: clock.schedule)
        var presses = 0
        repeater.start { presses += 1 }
        clock.fire()
        repeater.stop()
        clock.fire()
        #expect(presses == 1)
    }
}
