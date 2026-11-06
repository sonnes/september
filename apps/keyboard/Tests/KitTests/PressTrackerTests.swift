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
struct PressTrackerTests {
    @Test func `a tap presses once, on release`() {
        let clock = ManualClock()
        let tracker = PressTracker(schedule: clock.schedule)
        var presses = 0
        tracker.down(repeats: true) { presses += 1 }
        #expect(tracker.isPressed)
        #expect(presses == 0)

        tracker.up(inside: true) { presses += 1 }
        #expect(!tracker.isPressed)
        #expect(presses == 1)
        clock.fire()
        #expect(presses == 1, "the release cancels the pending repeat")
    }

    @Test func `a hold presses once at the hold delay, then repeats, and the release adds nothing`() {
        let clock = ManualClock()
        let tracker = PressTracker(schedule: clock.schedule)
        var presses = 0
        tracker.down(repeats: true) { presses += 1 }
        #expect(presses == 0)
        clock.fire()
        clock.fire()
        clock.fire()
        #expect(presses == 3)
        #expect(clock.delays == [
            Metrics.holdDuration, Metrics.keyRepeatInterval,
            Metrics.keyRepeatInterval, Metrics.keyRepeatInterval,
        ])

        tracker.up(inside: true) { presses += 1 }
        #expect(presses == 3)
    }

    @Test func `releasing a held key stops the repeat`() {
        let clock = ManualClock()
        let tracker = PressTracker(schedule: clock.schedule)
        var presses = 0
        tracker.down(repeats: true) { presses += 1 }
        clock.fire()
        tracker.up(inside: true) { presses += 1 }
        clock.fire()
        #expect(presses == 1)
    }

    @Test func `a drag that reports the pointer down again starts one press`() {
        let clock = ManualClock()
        let tracker = PressTracker(schedule: clock.schedule)
        var presses = 0
        #expect(tracker.down(repeats: true) { presses += 1 })
        #expect(!tracker.down(repeats: true) { presses += 1 })
        #expect(clock.delays.count == 1)
        tracker.up(inside: true) { presses += 1 }
        #expect(presses == 1)
    }

    @Test func `a button that does not repeat presses once however long it is held`() {
        let clock = ManualClock()
        let tracker = PressTracker(schedule: clock.schedule)
        var presses = 0
        tracker.down(repeats: false) { presses += 1 }
        clock.fire()
        tracker.up(inside: true) { presses += 1 }
        #expect(presses == 1)
        #expect(clock.delays.isEmpty)
    }

    @Test func `a release outside the control sends nothing`() {
        let clock = ManualClock()
        let tracker = PressTracker(schedule: clock.schedule)
        var presses = 0
        tracker.down(repeats: false) { presses += 1 }
        tracker.up(inside: false) { presses += 1 }
        #expect(presses == 0)
        #expect(!tracker.isPressed)
    }

    @Test func `leaving the control during a hold stops the repeat and keeps what it sent`() {
        let clock = ManualClock()
        let tracker = PressTracker(schedule: clock.schedule)
        var presses = 0
        tracker.down(repeats: true) { presses += 1 }
        clock.fire()
        tracker.moved(inside: false)
        #expect(!tracker.isPressed)
        clock.fire()
        tracker.moved(inside: true)
        tracker.up(inside: true) { presses += 1 }
        #expect(presses == 1)
    }

    @Test func `leaving the control before the hold delay cancels the tap`() {
        let clock = ManualClock()
        let tracker = PressTracker(schedule: clock.schedule)
        var presses = 0
        tracker.down(repeats: true) { presses += 1 }
        tracker.moved(inside: false)
        clock.fire()
        tracker.moved(inside: true)
        tracker.up(inside: true) { presses += 1 }
        #expect(presses == 0)

        tracker.down(repeats: true) { presses += 1 }
        tracker.up(inside: true) { presses += 1 }
        #expect(presses == 1, "the next press starts fresh")
    }
}
