import SeptemberKit

func modifierStateTests() {
    test("a tapped modifier applies to exactly one keystroke") {
        var state = ModifierState()
        state.tap(.command)
        expectEqual(state.active, .command)
        state.consume()
        expectEqual(state.active, [])
    }

    test("a double tapped modifier locks until tapped again") {
        var state = ModifierState()
        state.tap(.command)
        state.tap(.command)
        expectEqual(state.active, .command)
        state.consume()
        expectEqual(state.active, .command, "locked modifiers survive a keystroke")
        state.tap(.command)
        expectEqual(state.active, [])
    }

    test("modifiers combine") {
        var state = ModifierState()
        state.tap(.shift)
        state.tap(.command)
        expectEqual(state.active, [.shift, .command])
    }

    test("caps lock latches on its own and is not consumed") {
        var state = ModifierState()
        state.tap(.capsLock)
        expect(state.isCapsLockOn)
        state.consume()
        expect(state.isCapsLockOn, "caps lock stays on across keystrokes")
        state.tap(.capsLock)
        expect(!state.isCapsLockOn)
    }

    test("shift and caps lock both uppercase, together they cancel") {
        var state = ModifierState()
        expectEqual(state.apply(to: "a"), "a")
        state.tap(.shift)
        expectEqual(state.apply(to: "a"), "A")
        state.consume()
        state.tap(.capsLock)
        expectEqual(state.apply(to: "a"), "A")
        state.tap(.shift)
        expectEqual(state.apply(to: "a"), "a")
    }
}

func keyCodeMapTests() {
    // A stub of a US layout: keycode 0 is "a", 18 is "1", shift changes both.
    let map = KeyCodeMap { code, modifiers in
        switch (code, modifiers.contains(.shift)) {
        case (0, false): "a"
        case (0, true): "A"
        case (18, false): "1"
        case (18, true): "!"
        case (24, false): "="
        case (24, true): "+"
        default: nil
        }
    }

    test("unshifted characters map to their key") {
        let stroke = map.keystroke(for: "a")
        expectEqual(stroke?.virtualKey, 0)
        expectEqual(stroke?.modifiers, [])
    }

    test("shifted characters carry the shift flag") {
        let stroke = map.keystroke(for: "!")
        expectEqual(stroke?.virtualKey, 18)
        expectEqual(stroke?.modifiers, .shift)
        expectEqual(map.keystroke(for: "A")?.virtualKey, 0)
        expectEqual(map.keystroke(for: "A")?.modifiers, .shift)
    }

    test("characters the layout cannot produce return nil") {
        expect(map.keystroke(for: "π") == nil)
    }
}

func keystrokeTests() {
    test("a plain character is one down and one up") {
        let events = Keystroke.events(virtualKey: 0, modifiers: [])
        expectEqual(events.count, 2)
        expectEqual(events[0], Keystroke(virtualKey: 0, flags: [], isDown: true))
        expectEqual(events[1], Keystroke(virtualKey: 0, flags: [], isDown: false))
    }

    test("shift command Z presses modifiers first and releases them last") {
        let events = Keystroke.events(virtualKey: VirtualKey.z.rawValue, modifiers: [.shift, .command])
        expectEqual(events.count, 6)
        expectEqual(events.filter(\.isDown).count, 3)

        let downKeys = events.filter(\.isDown).map(\.virtualKey)
        expectEqual(downKeys, [Modifiers.shift.virtualKey!, Modifiers.command.virtualKey!, VirtualKey.z.rawValue])

        let upKeys = events.filter { !$0.isDown }.map(\.virtualKey)
        expectEqual(upKeys, [VirtualKey.z.rawValue, Modifiers.command.virtualKey!, Modifiers.shift.virtualKey!])
    }

    test("the key itself carries the modifier flags so apps see the combination") {
        let events = Keystroke.events(virtualKey: VirtualKey.z.rawValue, modifiers: [.command])
        let keyDown = events.first { $0.virtualKey == VirtualKey.z.rawValue && $0.isDown }
        expectEqual(keyDown?.flags, .command)
    }

    test("caps lock is never posted as part of a combination") {
        let events = Keystroke.events(virtualKey: 0, modifiers: [.capsLock, .shift])
        expect(!events.contains { $0.virtualKey == Modifiers.capsLock.virtualKey })
    }
}
