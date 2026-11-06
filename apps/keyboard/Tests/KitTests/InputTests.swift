import SeptemberKit
import Testing

struct ModifierStateTests {
    @Test func `a tapped modifier applies to exactly one keystroke`() throws {
        var state = ModifierState()
        state.tap(.command)
        #expect(state.active == .command)
        state.consume()
        #expect(state.active == [])
    }

    @Test func `a double tapped modifier locks until tapped again`() throws {
        var state = ModifierState()
        state.tap(.command)
        state.tap(.command)
        #expect(state.active == .command)
        state.consume()
        #expect(state.active == .command, "locked modifiers survive a keystroke")
        state.tap(.command)
        #expect(state.active == [])
    }

    @Test func `modifiers combine`() throws {
        var state = ModifierState()
        state.tap(.shift)
        state.tap(.command)
        #expect(state.active == [.shift, .command])
    }

    @Test func `caps lock latches on its own and is not consumed`() throws {
        var state = ModifierState()
        state.tap(.capsLock)
        #expect(state.isCapsLockOn)
        state.consume()
        #expect(state.isCapsLockOn, "caps lock stays on across keystrokes")
        state.tap(.capsLock)
        #expect(!state.isCapsLockOn)
    }

    @Test func `shift and caps lock both uppercase, together they cancel`() throws {
        var state = ModifierState()
        #expect(state.apply(to: "a") == "a")
        state.tap(.shift)
        #expect(state.apply(to: "a") == "A")
        state.consume()
        state.tap(.capsLock)
        #expect(state.apply(to: "a") == "A")
        state.tap(.shift)
        #expect(state.apply(to: "a") == "a")
    }
}

struct KeyCodeMapTests {
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

    @Test func `unshifted characters map to their key`() throws {
        let stroke = map.keystroke(for: "a")
        #expect(stroke?.virtualKey == 0)
        #expect(stroke?.modifiers == [])
    }

    @Test func `shifted characters carry the shift flag`() throws {
        let stroke = map.keystroke(for: "!")
        #expect(stroke?.virtualKey == 18)
        #expect(stroke?.modifiers == .shift)
        #expect(map.keystroke(for: "A")?.virtualKey == 0)
        #expect(map.keystroke(for: "A")?.modifiers == .shift)
    }

    @Test func `characters the layout cannot produce return nil`() throws {
        #expect(map.keystroke(for: "π") == nil)
    }
}

struct KeystrokeTests {
    let z: UInt16 = 6

    @Test func `a plain character is one down and one up`() throws {
        let events = Keystroke.events(virtualKey: 0, modifiers: [])
        #expect(events.count == 2)
        #expect(events[0] == Keystroke(virtualKey: 0, flags: [], isDown: true))
        #expect(events[1] == Keystroke(virtualKey: 0, flags: [], isDown: false))
    }

    @Test func `shift command Z presses modifiers first and releases them last`() throws {
        let events = Keystroke.events(virtualKey: z, modifiers: [.shift, .command])
        #expect(events.count == 6)
        #expect(events.filter(\.isDown).count == 3)

        let downKeys = events.filter(\.isDown).map(\.virtualKey)
        #expect(downKeys == [56, 55, z])

        let upKeys = events.filter { !$0.isDown }.map(\.virtualKey)
        #expect(upKeys == [z, 55, 56])
    }

    @Test func `the key itself carries the modifier flags so apps see the combination`() throws {
        let events = Keystroke.events(virtualKey: z, modifiers: [.command])
        let keyDown = events.first { $0.virtualKey == z && $0.isDown }
        #expect(keyDown?.flags == .command)
    }

    @Test func `caps lock is never posted as part of a combination`() throws {
        let events = Keystroke.events(virtualKey: 0, modifiers: [.capsLock, .shift])
        #expect(events.filter(\.isDown).map(\.virtualKey) == [56, 0])
    }
}
