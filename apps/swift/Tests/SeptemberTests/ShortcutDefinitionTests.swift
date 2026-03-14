import CoreGraphics
import Testing

@testable import September

@Suite("ShortcutDefinition")
struct ShortcutDefinitionTests {

    @Test("Left keypad has 12 edit shortcuts")
    func leftKeypadCount() {
        #expect(ShortcutLayout.leftKeypad.shortcuts.count == 12)
    }

    @Test("All left keypad shortcuts have non-empty labels and icons")
    func leftKeypadLabelsAndIcons() {
        for shortcut in ShortcutLayout.leftKeypad.shortcuts {
            #expect(!shortcut.label.isEmpty, "Empty label found")
            #expect(!shortcut.icon.isEmpty, "Empty icon found for \(shortcut.label)")
            #expect(!shortcut.tooltip.isEmpty, "Empty tooltip found for \(shortcut.label)")
        }
    }

    @Test("Cut shortcut has Command modifier")
    func cutHasCommandModifier() {
        let cut = ShortcutLayout.leftKeypad.shortcuts.first { $0.label == "Cut" }
        #expect(cut != nil)
        #expect(cut?.modifiers == .maskCommand)
        #expect(cut?.keyCode == KeyCodes.x)
    }

    @Test("Redo shortcut has Command+Shift modifiers")
    func redoHasCommandShift() {
        let redo = ShortcutLayout.leftKeypad.shortcuts.first { $0.label == "Redo" }
        #expect(redo != nil)
        #expect(redo?.modifiers.contains(.maskCommand) == true)
        #expect(redo?.modifiers.contains(.maskShift) == true)
    }

    @Test("Right keypad has navigation shortcuts")
    func rightKeypadNonEmpty() {
        #expect(!ShortcutLayout.rightKeypad.shortcuts.isEmpty)
    }

    @Test("All shortcuts have keyboard hints")
    func keyboardHints() {
        let withHints = ShortcutLayout.leftKeypad.shortcuts.filter { $0.keyboardHint != nil }
        #expect(withHints.count == 12, "All left keypad shortcuts should have keyboard hints")
    }
}
