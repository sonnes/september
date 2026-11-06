import Foundation
import SeptemberKit

@MainActor
func pressTests() {
    keyTimingTests()
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
