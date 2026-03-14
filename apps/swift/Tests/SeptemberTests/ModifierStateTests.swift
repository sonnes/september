import Testing

@testable import September

@Suite("ModifierState")
struct ModifierStateTests {

    @Test("Toggle shift on and off")
    @MainActor
    func toggleShift() {
        let state = ModifierState()
        #expect(state.isShiftActive == false)

        state.toggle(KeyCodes.shift)
        #expect(state.isShiftActive == true)

        state.toggle(KeyCodes.shift)
        #expect(state.isShiftActive == false)
    }

    @Test("Toggle caps lock on and off")
    @MainActor
    func toggleCapsLock() {
        let state = ModifierState()
        state.toggle(KeyCodes.capsLock)
        #expect(state.isCapsLockOn == true)

        state.toggle(KeyCodes.capsLock)
        #expect(state.isCapsLockOn == false)
    }

    @Test("Effective shift combines shift and caps lock")
    @MainActor
    func effectiveShift() {
        let state = ModifierState()
        #expect(state.effectiveShift == false)

        state.toggle(KeyCodes.shift)
        #expect(state.effectiveShift == true)

        state.toggle(KeyCodes.shift)
        state.toggle(KeyCodes.capsLock)
        #expect(state.effectiveShift == true)
    }

    @Test("Reset clears shift but not caps lock")
    @MainActor
    func resetAfterKeyPress() {
        let state = ModifierState()
        state.toggle(KeyCodes.shift)
        state.toggle(KeyCodes.capsLock)
        state.toggle(KeyCodes.command)

        state.resetAfterKeyPress()

        #expect(state.isShiftActive == false)
        #expect(state.isCommandActive == false)
        #expect(state.isCapsLockOn == true)
    }

    @Test("Multi-modifier combo: Cmd+Shift")
    @MainActor
    func multiModifierCombo() {
        let state = ModifierState()
        state.toggle(KeyCodes.command)
        state.toggle(KeyCodes.shift)

        let flags = state.modifierFlags()
        #expect(flags.contains(.maskCommand))
        #expect(flags.contains(.maskShift))
    }

    @Test("Modifier flags returns correct CGEventFlags")
    @MainActor
    func modifierFlags() {
        let state = ModifierState()
        #expect(state.modifierFlags() == [])

        state.toggle(KeyCodes.command)
        #expect(state.modifierFlags().contains(.maskCommand))

        state.toggle(KeyCodes.control)
        #expect(state.modifierFlags().contains(.maskControl))

        state.toggle(KeyCodes.option)
        #expect(state.modifierFlags().contains(.maskAlternate))
    }

    @Test("Right modifier variants toggle same state")
    @MainActor
    func rightModifiers() {
        let state = ModifierState()
        state.toggle(KeyCodes.rightCommand)
        #expect(state.isCommandActive == true)

        state.toggle(KeyCodes.rightShift)
        #expect(state.isShiftActive == true)

        state.toggle(KeyCodes.rightOption)
        #expect(state.isOptionActive == true)
    }

    @Test("hasActiveModifiers reflects state")
    @MainActor
    func hasActiveModifiers() {
        let state = ModifierState()
        #expect(state.hasActiveModifiers == false)

        state.toggle(KeyCodes.command)
        #expect(state.hasActiveModifiers == true)

        state.resetAfterKeyPress()
        #expect(state.hasActiveModifiers == false)
    }

    @Test("Unknown keyCode is a no-op")
    @MainActor
    func unknownKeyCode() {
        let state = ModifierState()
        state.toggle(0xFF)
        #expect(state.isShiftActive == false)
        #expect(state.isCommandActive == false)
    }
}
