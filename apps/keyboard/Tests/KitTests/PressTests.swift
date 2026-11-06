import Foundation
import SeptemberKit

@MainActor
func pressTests() {
    keyTimingTests()
    keyPresserTests()
}

/// A clock that moves only when a test moves it.
@MainActor
final class FakeClock: PressScheduler {
    private final class Item: PressCancellable {
        let at: TimeInterval
        let order: Int
        let work: @MainActor () -> Void
        var isCancelled = false

        init(at: TimeInterval, order: Int, work: @escaping @MainActor () -> Void) {
            self.at = at
            self.order = order
            self.work = work
        }

        func cancel() { isCancelled = true }
    }

    private(set) var now: TimeInterval = 0
    private var items: [Item] = []
    private var order = 0

    func schedule(after delay: TimeInterval, _ work: @escaping @MainActor () -> Void) -> any PressCancellable {
        order += 1
        let item = Item(at: now + delay, order: order, work: work)
        items.append(item)
        return item
    }

    /// Runs each piece of work that is due by `time`, in order.
    func advance(to time: TimeInterval) {
        while let next = items
            .filter({ !$0.isCancelled && $0.at <= time })
            .min(by: { ($0.at, $0.order) < ($1.at, $1.order) })
        {
            items.removeAll { $0 === next }
            now = next.at
            next.work()
        }
        now = time
    }
}

/// Counts what a press does.
@MainActor
final class PressLog {
    var acts = 0
    var agains = 0
    var choices: [[String]] = []
}

@MainActor
private func makePresser(_ timing: KeyTiming) -> (KeyPresser, FakeClock) {
    let clock = FakeClock()
    return (KeyPresser(timing: { timing }, scheduler: clock), clock)
}

private let quick = KeyTiming(holdDelay: 0.5, repeatInterval: 0.25, pressAndHold: true, slowKeysDelay: nil)

@MainActor
@discardableResult
private func down(_ presser: KeyPresser, _ hold: HoldBehavior, _ log: PressLog) -> Int {
    presser.down(
        hold, act: { log.acts += 1 }, again: { log.agains += 1 }, choices: { log.choices.append($0) })
}

@MainActor
private func keyPresserTests() {
    test("a key acts when the button goes down") {
        let (presser, _) = makePresser(quick)
        let log = PressLog()
        down(presser, .once, log)
        expectEqual(log.acts, 1)
    }

    test("a key that acts once does not repeat while it is held") {
        let (presser, clock) = makePresser(quick)
        let log = PressLog()
        let press = down(presser, .once, log)
        clock.advance(to: 5)
        presser.up(press)
        expectEqual(log.acts, 1)
        expectEqual(log.agains, 0)
    }

    test("a held key repeats after the delay, at the interval, until it goes up") {
        let (presser, clock) = makePresser(quick)
        let log = PressLog()
        let press = down(presser, .repeats, log)
        clock.advance(to: 0.25)
        expectEqual(log.agains, 0)
        clock.advance(to: 0.5)
        expectEqual(log.agains, 1)
        clock.advance(to: 1)
        expectEqual(log.agains, 3)
        presser.up(press)
        clock.advance(to: 3)
        expectEqual(log.agains, 3)
        expectEqual(log.acts, 1)
    }

    test("a held key does not repeat when key repeat is off") {
        var timing = quick
        timing.repeatInterval = nil
        let (presser, clock) = makePresser(timing)
        let log = PressLog()
        down(presser, .repeats, log)
        clock.advance(to: 5)
        expectEqual(log.agains, 0)
    }

    test("a held letter shows its accents after the delay and does not repeat") {
        let (presser, clock) = makePresser(quick)
        let log = PressLog()
        down(presser, .letter(choices: ["é", "è"]), log)
        clock.advance(to: 0.25)
        expectEqual(log.choices, [])
        clock.advance(to: 3)
        expectEqual(log.choices, [["é", "è"]])
        expectEqual(log.agains, 0)
    }

    test("a letter with no accents does not repeat while press and hold is on") {
        let (presser, clock) = makePresser(quick)
        let log = PressLog()
        down(presser, .letter(choices: []), log)
        clock.advance(to: 3)
        expectEqual(log.choices, [])
        expectEqual(log.agains, 0)
    }

    test("a letter that goes up before the delay shows no accents") {
        let (presser, clock) = makePresser(quick)
        let log = PressLog()
        let press = down(presser, .letter(choices: ["é"]), log)
        clock.advance(to: 0.25)
        presser.up(press)
        clock.advance(to: 3)
        expectEqual(log.choices, [])
    }

    test("a held letter repeats when press and hold is off") {
        var timing = quick
        timing.pressAndHold = false
        let (presser, clock) = makePresser(timing)
        let log = PressLog()
        down(presser, .letter(choices: ["é"]), log)
        clock.advance(to: 0.75)
        expectEqual(log.agains, 2)
        expectEqual(log.choices, [])
    }

    test("with Slow Keys, a key acts only after the acceptance delay") {
        var timing = quick
        timing.slowKeysDelay = 0.25
        let (presser, clock) = makePresser(timing)
        let log = PressLog()
        down(presser, .repeats, log)
        expectEqual(log.acts, 0)
        clock.advance(to: 0.25)
        expectEqual(log.acts, 1)
        clock.advance(to: 0.5)
        expectEqual(log.agains, 0, "the repeat delay starts when the key acts")
        clock.advance(to: 0.75)
        expectEqual(log.agains, 1)
    }

    test("with Slow Keys, a key that goes up before the delay does nothing") {
        var timing = quick
        timing.slowKeysDelay = 0.25
        let (presser, clock) = makePresser(timing)
        let log = PressLog()
        let press = down(presser, .repeats, log)
        clock.advance(to: 0.125)
        presser.up(press)
        clock.advance(to: 3)
        expectEqual(log.acts, 0)
        expectEqual(log.agains, 0)
    }

    test("a new press ends the press before it") {
        let (presser, clock) = makePresser(quick)
        let first = PressLog()
        let second = PressLog()
        let old = down(presser, .repeats, first)
        down(presser, .repeats, second)
        presser.up(old)
        clock.advance(to: 1)
        expectEqual(first.agains, 0)
        expectEqual(second.agains, 3, "an up of the old press does not end the new press")
    }

    test("each press reads the settings again") {
        var timing = quick
        let clock = FakeClock()
        let presser = KeyPresser(timing: { timing }, scheduler: clock)
        let log = PressLog()
        presser.up(down(presser, .once, log))
        timing.slowKeysDelay = 0.25
        down(presser, .once, log)
        expectEqual(log.acts, 1)
        clock.advance(to: 0.25)
        expectEqual(log.acts, 2)
    }
}

@MainActor
private func keyTimingTests() {
    test("key timing takes the repeat delay and interval of macOS") {
        let timing = KeyTiming(
            repeatDelay: 0.5, repeatInterval: 0.1, pressAndHold: false, slowKeys: false, slowKeyDelay: 250)
        expectEqual(timing.holdDelay, 0.5)
        expectEqual(timing.repeatInterval, 0.1)
        expectEqual(timing.pressAndHold, false)
        expectEqual(timing.slowKeysDelay, nil)
    }

    test("an interval or a delay of hours means that key repeat is off") {
        let slowInterval = KeyTiming(
            repeatDelay: 0.5, repeatInterval: 4500, pressAndHold: true, slowKeys: false, slowKeyDelay: nil)
        expectEqual(slowInterval.repeatInterval, nil)
        expectEqual(slowInterval.holdDelay, 0.5)
        let longDelay = KeyTiming(
            repeatDelay: 4500, repeatInterval: 0.1, pressAndHold: true, slowKeys: false, slowKeyDelay: nil)
        expectEqual(longDelay.repeatInterval, nil)
        expectEqual(longDelay.holdDelay, KeyTiming.standard.holdDelay, "accents still show")
    }

    test("press and hold is on when macOS stores no value") {
        let timing = KeyTiming(
            repeatDelay: 0.5, repeatInterval: 0.1, pressAndHold: nil, slowKeys: false, slowKeyDelay: nil)
        expect(timing.pressAndHold)
    }

    test("Slow Keys takes its delay in milliseconds") {
        let timing = KeyTiming(
            repeatDelay: 0.5, repeatInterval: 0.1, pressAndHold: true, slowKeys: true, slowKeyDelay: 250)
        expectEqual(timing.slowKeysDelay, 0.25)
    }

    test("key timing reads Slow Keys and press and hold from the defaults") {
        let suite = "september-test-\(UUID().uuidString)"
        let global = UserDefaults(suiteName: suite + "-global")!
        let access = UserDefaults(suiteName: suite + "-access")!
        global.set(false, forKey: "ApplePressAndHoldEnabled")
        access.set(true, forKey: "slowKey")
        access.set(500, forKey: "slowKeyDelay")
        let timing = KeyTiming.current(global: global, universalAccess: access)
        expectEqual(timing.pressAndHold, false)
        expectEqual(timing.slowKeysDelay, 0.5)
        access.set(false, forKey: "slowKey")
        expectEqual(KeyTiming.current(global: global, universalAccess: access).slowKeysDelay, nil)
    }
}
