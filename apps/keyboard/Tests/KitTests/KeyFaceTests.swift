import SeptemberKit

private func key(_ id: String) -> KeyDefinition {
    for row in KeyboardLayout.rows {
        if let match = row.keys.first(where: { $0.id == id }) { return match }
    }
    fatalError("no key \(id)")
}

private func state(_ taps: Modifiers...) -> ModifierState {
    state(taps)
}

private func state(_ taps: [Modifiers]) -> ModifierState {
    var state = ModifierState()
    for modifier in taps { state.tap(modifier) }
    return state
}

@MainActor
func keyFaceTests() {
    test("an F-key shows its F name under shift, control, option, command, or fn") {
        for modifier in [Modifiers.shift, .control, .option, .command, .function] {
            let face = key("f8").face(under: state(modifier))
            expectEqual(face.glyph, .text("F8"), "under \(modifier)")
            expectEqual(face.accessibilityLabel, "F8")
        }
    }

    test("a modifier that macOS holds changes the labels as a tapped one does") {
        let (controller, _) = try makeController()
        controller.macModifiersChanged(.function)
        expectEqual(key("f8").face(under: controller.modifiers).glyph, .text("F8"))
        expectEqual(key("fn").face(under: controller.modifiers).look, .latched)
        controller.macModifiersChanged(.shift)
        expectEqual(key("key-a").face(under: controller.modifiers).glyph, .text("A"))
        expectEqual(key("shift-left").face(under: controller.modifiers).look, .latched)
    }

    test("the Spotlight shortcut comes from the settings of macOS") {
        let custom: [String: Any] = [
            "64": ["enabled": 1, "value": ["parameters": [65535, 3, 1_572_864]]]
        ]
        let hotKey = SpotlightHotKey(symbolicHotKeys: custom)
        expectEqual(hotKey?.virtualKey, 3)
        expectEqual(hotKey?.modifiers, [.command, .option])
        expect(SpotlightHotKey(symbolicHotKeys: ["64": ["enabled": 0]]) == nil, "the user turned it off")
        let standard = SpotlightHotKey(symbolicHotKeys: [:])
        expectEqual(standard?.virtualKey, 49)
        expectEqual(standard?.modifiers, .command)
    }

    test("the Dictation menu item is found by its title") {
        expect(DictationMenu.isStartItem("Start Dictation…"))
        expect(DictationMenu.isStartItem("Start Dictation..."))
        expect(!DictationMenu.isStartItem("Stop Dictation"))
        expect(!DictationMenu.isStartItem("Emoji & Symbols"))
    }

    test("caps lock does not change the F-row") {
        expectEqual(key("f8").face(under: state(.capsLock)), key("f8").face(under: ModifierState()))
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
        expectEqual(off.look, .off)
        expectEqual(once.look, .latched)
        expectEqual(locked.look, .locked)
        expect(off.glyph != once.glyph && once.glyph != locked.glyph && off.glyph != locked.glyph)
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
        expectEqual(caps.face(under: ModifierState()).look, .off)
        expectEqual(caps.face(under: state(.capsLock)).look, .locked)
        expect(caps.face(under: ModifierState()).glyph != caps.face(under: state(.capsLock)).glyph)
    }

    test("a modifier key on the right side follows the same state") {
        for taps in [[], [Modifiers.command], [.command, .command]] {
            let modifiers = state(taps)
            expectEqual(key("command-right").face(under: modifiers).look, key("command-left").face(under: modifiers).look)
        }
        expectEqual(key("command-right").face(under: state(.command, .command)).look, .locked)
    }

    test("each F-key shows the media key of an Apple keyboard") {
        let media: [MediaKey] = [
            .brightnessDown, .brightnessUp, .missionControl, .spotlight, .dictation, .doNotDisturb,
            .previous, .playPause, .next, .mute, .volumeDown, .volumeUp,
        ]
        for (index, expected) in media.enumerated() {
            let number = index + 1
            expectEqual(MediaKey.onFunctionKey(number), expected, "F\(number)")
            let face = key("f\(number)").face(under: ModifierState())
            expectEqual(face.glyph, .symbol(expected.symbolName), "F\(number)")
            expectEqual(face.accessibilityLabel, expected.spokenName, "F\(number)")
        }
        expectEqual(MediaKey.onFunctionKey(0), nil)
        expectEqual(MediaKey.onFunctionKey(13), nil)
    }
}
