import Testing

@testable import September

@Suite("KeyDefinition")
struct KeyDefinitionTests {

    @Test("Standard key has correct type and dimensions")
    func standardKey() {
        let key = KeyDefinition("a", code: KeyCodes.a)
        #expect(key.keyType == .standard)
        #expect(key.height == 48)
        #expect(key.width == .standard)
        #expect(key.isDualLabel == false)
    }

    @Test("Function key has 32pt height")
    func functionKey() {
        let key = KeyDefinition("F1", code: KeyCodes.f1, width: .wide, type: .function)
        #expect(key.keyType == .function)
        #expect(key.height == 32)
    }

    @Test("Dual key has isDualLabel true")
    func dualKey() {
        let key = KeyDefinition("1", shift: "!", code: KeyCodes.one, type: .dual)
        #expect(key.isDualLabel == true)
        #expect(key.shiftLabel == "!")
    }

    @Test("Special key has correct type")
    func specialKey() {
        let key = KeyDefinition("⇧", code: KeyCodes.shift, width: .extraWide, isModifier: true, type: .special)
        #expect(key.keyType == .special)
        #expect(key.isModifier == true)
    }

    @Test("Key without shift label is not dual")
    func noDualLabel() {
        let key = KeyDefinition("a", code: KeyCodes.a)
        #expect(key.isDualLabel == false)
        #expect(key.shiftLabel == nil)
    }
}
