import SeptemberKit

private func key(_ id: String) -> KeyDefinition {
    for row in KeyboardLayout.rows {
        if let match = row.keys.first(where: { $0.id == id }) { return match }
    }
    fatalError("no key \(id)")
}

private func state(_ taps: Modifiers...) -> ModifierState {
    var state = ModifierState()
    for modifier in taps { state.tap(modifier) }
    return state
}

@MainActor
func keyFaceTests() {
    test("an F-key shows its media icon when no modifier is on") {
        let face = key("f8").face(under: ModifierState())
        expectEqual(face.glyph, .symbol("playpause.fill"))
        expectEqual(face.accessibilityLabel, "Play or Pause")
    }

    test("an F-key shows its F name under shift, control, option, command, or fn") {
        for modifier in [Modifiers.shift, .control, .option, .command, .function] {
            let face = key("f8").face(under: state(modifier))
            expectEqual(face.glyph, .text("F8"), "under \(modifier)")
            expectEqual(face.accessibilityLabel, "F8")
        }
    }

    test("a modifier that macOS holds changes the labels as a tapped one does") {
        var held = ModifierState()
        held.setMac(.function)
        expectEqual(key("f8").face(under: held).glyph, .text("F8"))
        expectEqual(key("fn").face(under: held).look, .latched)
        held.setMac(.shift)
        expectEqual(key("key-a").face(under: held).glyph, .text("A"))
        expectEqual(key("shift-left").face(under: held).glyph, .symbol("shift.fill"))
    }

    test("caps lock does not change the F-row") {
        expectEqual(key("f8").face(under: state(.capsLock)).glyph, .symbol("playpause.fill"))
    }

    test("a letter shows its case: lower, upper under shift or caps lock") {
        expectEqual(key("key-a").face(under: ModifierState()).glyph, .text("a"))
        expectEqual(key("key-a").face(under: state(.shift)).glyph, .text("A"))
        expectEqual(key("key-a").face(under: state(.capsLock)).glyph, .text("A"))
    }

    test("a dual key marks its shifted symbol while shift is on") {
        expect(!key("key-1").face(under: ModifierState()).isShifted)
        expect(key("key-1").face(under: state(.shift)).isShifted)
    }

    test("shift shows off, on for one key, and locked") {
        let shift = key("shift-left")
        let off = shift.face(under: ModifierState())
        let once = shift.face(under: state(.shift))
        let locked = shift.face(under: state(.shift, .shift))
        expectEqual(off.glyph, .symbol("shift"))
        expectEqual(off.look, .off)
        expectEqual(once.glyph, .symbol("shift.fill"))
        expectEqual(once.look, .latched)
        expectEqual(locked.glyph, .symbol("capslock.fill"))
        expectEqual(locked.look, .locked)
        expectEqual(locked.accessibilityLabel, "Shift, locked")
    }

    test("a second tap on control locks it, and a third tap clears it") {
        let control = key("control")
        expectEqual(control.face(under: state(.control)).look, .latched)
        expectEqual(control.face(under: state(.control, .control)).look, .locked)
        expectEqual(control.face(under: state(.control, .control)).accessibilityLabel, "Control, locked")
        expectEqual(control.face(under: state(.control, .control, .control)).look, .off)
        expectEqual(control.face(under: state(.control)).glyph, .text("⌃"))
    }

    test("caps lock shows its light when on") {
        let caps = key("capslock")
        expectEqual(caps.face(under: ModifierState()).glyph, .symbol("capslock"))
        expectEqual(caps.face(under: state(.capsLock)).glyph, .symbol("capslock.fill"))
        expectEqual(caps.face(under: state(.capsLock)).look, .locked)
    }

    test("a modifier key on the right side follows the same state") {
        expectEqual(key("command-right").face(under: state(.command, .command)).look, .locked)
    }

    test("every F-key has a media key") {
        for number in 1...12 {
            let face = key("f\(number)").face(under: ModifierState())
            guard case .symbol = face.glyph else { return expect(false, "f\(number) has no icon") }
        }
    }
}
