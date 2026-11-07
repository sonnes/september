import SeptemberKit

/// The press of a control that acts when the button goes up, such as Speak.
@MainActor
func pressTrackerTests() {
    test("a tap presses once, on release inside the control") {
        let tracker = PressTracker()
        var presses = 0
        tracker.down()
        expect(tracker.isPressed)
        expectEqual(presses, 0)
        tracker.up(inside: true) { presses += 1 }
        expect(!tracker.isPressed)
        expectEqual(presses, 1)
    }

    test("a drag that reports the pointer down again starts one press") {
        let tracker = PressTracker()
        var presses = 0
        expect(tracker.down())
        expect(!tracker.down())
        tracker.up(inside: true) { presses += 1 }
        expectEqual(presses, 1)
    }

    test("a release outside the control sends nothing") {
        let tracker = PressTracker()
        var presses = 0
        tracker.down()
        tracker.up(inside: false) { presses += 1 }
        expectEqual(presses, 0)
        expect(!tracker.isPressed)
    }

    test("leaving the control cancels the tap, and the next press starts fresh") {
        let tracker = PressTracker()
        var presses = 0
        tracker.down()
        tracker.moved(inside: false)
        expect(!tracker.isPressed)
        tracker.moved(inside: true)
        tracker.up(inside: true) { presses += 1 }
        expectEqual(presses, 0)

        tracker.down()
        tracker.up(inside: true) { presses += 1 }
        expectEqual(presses, 1)
    }
}
