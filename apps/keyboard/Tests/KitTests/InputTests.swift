import CoreGraphics
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

    test("a modifier that macOS holds is on and shows as latched until macOS releases it") {
        var state = ModifierState()
        state.mac = .shift
        expectEqual(state.active, .shift)
        expectEqual(state.look(of: .shift), .latched)
        state.consume()
        expectEqual(state.active, .shift)
        state.mac = []
        expectEqual(state.active, [])
    }

    test("the flags of a key leave out caps lock, and a chord also leaves out shift") {
        var state = ModifierState()
        state.tap(.capsLock)
        state.tap(.shift)
        expectEqual(state.flags, .shift)
        expectEqual(state.chord, [])
        expect(state.holdsChord, "shift turns the F-row into F-keys")
        state.mac = .command
        expectEqual(state.flags, [.shift, .command])
        expectEqual(state.chord, .command)
    }

    test("caps lock alone holds no chord") {
        var state = ModifierState()
        state.tap(.capsLock)
        expect(!state.holdsChord)
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
    test("a modifier that is already down is not pressed again") {
        let events = Keystroke.events(virtualKey: 8, modifiers: [.command, .shift], held: .command)
        expectEqual(events, [
            Keystroke(virtualKey: 56, flags: [.command, .shift], isDown: true),
            Keystroke(virtualKey: 8, flags: [.command, .shift], isDown: true),
            Keystroke(virtualKey: 8, flags: [.command, .shift], isDown: false),
            Keystroke(virtualKey: 56, flags: .command, isDown: false),
        ])
    }

    let z: UInt16 = 6

    test("a plain character is one down and one up") {
        let events = Keystroke.events(virtualKey: 0, modifiers: [])
        expectEqual(events.count, 2)
        expectEqual(events[0], Keystroke(virtualKey: 0, flags: [], isDown: true))
        expectEqual(events[1], Keystroke(virtualKey: 0, flags: [], isDown: false))
    }

    test("shift command Z presses modifiers first and releases them last") {
        let events = Keystroke.events(virtualKey: z, modifiers: [.shift, .command])
        expectEqual(events.count, 6)
        expectEqual(events.filter(\.isDown).count, 3)

        let downKeys = events.filter(\.isDown).map(\.virtualKey)
        expectEqual(downKeys, [56, 55, z])

        let upKeys = events.filter { !$0.isDown }.map(\.virtualKey)
        expectEqual(upKeys, [z, 55, 56])
    }

    test("the key itself carries the modifier flags so apps see the combination") {
        let events = Keystroke.events(virtualKey: z, modifiers: [.command])
        let keyDown = events.first { $0.virtualKey == z && $0.isDown }
        expectEqual(keyDown?.flags, .command)
    }

    test("caps lock is never posted as part of a combination") {
        let events = Keystroke.events(virtualKey: 0, modifiers: [.capsLock, .shift])
        expectEqual(events.filter(\.isDown).map(\.virtualKey), [56, 0])
    }
}

func modifierNameTests() {
    test("panel modifier names decode, fn included") {
        expectEqual(try Modifiers(names: ["function", "command"]), [.function, .command])
    }

    test("an unknown modifier name is rejected") {
        expect((try? Modifiers(names: ["hyper"])) == nil)
    }

    test("event flags convert to the modifiers that they hold, without caps lock") {
        let flags: CGEventFlags = [.maskCommand, .maskShift, .maskSecondaryFn, .maskAlphaShift]
        expectEqual(Modifiers(eventFlags: flags), [.command, .shift, .function])
        expectEqual(Modifiers(eventFlags: [.maskControl, .maskAlternate]).eventFlags, [.maskControl, .maskAlternate])
    }

    test("the device flags give each left and right modifier key that the hardware holds") {
        let keys: [(UInt64, Modifiers)] = [
            (0x1, .control), (0x2000, .control), (0x2, .shift), (0x4, .shift),
            (0x8, .command), (0x10, .command), (0x20, .option), (0x40, .option),
        ]
        for (bit, modifier) in keys {
            expectEqual(Modifiers(deviceFlags: CGEventFlags(rawValue: bit)), modifier, "bit \(bit)")
        }
        expectEqual(Modifiers(deviceFlags: CGEventFlags(rawValue: 0x8 | 0x4)), [.command, .shift])
    }

    test("the device flags leave out a modifier that only the posted flags hold") {
        // The keyboard posts Command with no device bit. The hardware holds Shift.
        let flags = CGEventFlags(rawValue: CGEventFlags.maskCommand.rawValue | CGEventFlags.maskShift.rawValue | 0x2)
        expectEqual(Modifiers(deviceFlags: flags), .shift)
    }
}
