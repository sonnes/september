import Testing

@testable import September

@Suite("KeyboardLayout")
struct KeyboardLayoutTests {

    @Test("All rows are non-empty")
    func allRowsNonEmpty() {
        for (index, row) in KeyboardLayout.allRows.enumerated() {
            #expect(!row.isEmpty, "Row \(index) is empty")
        }
    }

    @Test("Has 6 rows (function, number, qwerty, asdf, zxcv, modifier)")
    func rowCount() {
        #expect(KeyboardLayout.allRows.count == 6)
    }

    @Test("Function row starts with Escape")
    func functionRowStartsWithEscape() {
        let first = KeyboardLayout.functionRow.first
        #expect(first?.keyCode == KeyCodes.escape)
        #expect(first?.keyType == .function)
    }

    @Test("Space bar exists in modifier row")
    func spaceBarExists() {
        let space = KeyboardLayout.modifierRow.first { $0.keyCode == KeyCodes.space }
        #expect(space != nil)
        #expect(space?.width == .space)
    }

    @Test("No duplicate key codes across all rows")
    func noDuplicateKeyCodes() {
        var seen = Set<UInt16>()
        var duplicates: [UInt16] = []

        for row in KeyboardLayout.allRows {
            for key in row {
                // Skip modifier keys that appear on both sides (e.g., left/right shift)
                if key.isModifier { continue }
                if seen.contains(key.keyCode) {
                    duplicates.append(key.keyCode)
                }
                seen.insert(key.keyCode)
            }
        }

        #expect(duplicates.isEmpty, "Duplicate keyCodes found: \(duplicates)")
    }

    @Test("Number row keys are dual-label type")
    func numberRowDualLabels() {
        let dualKeys = KeyboardLayout.numberRow.filter { $0.keyType == .dual }
        // All except the delete key should be dual
        #expect(dualKeys.count == 13)
    }

    @Test("Function row has 14 keys (esc + F1-F12 + forward delete)")
    func functionRowCount() {
        #expect(KeyboardLayout.functionRow.count == 14)
    }
}
