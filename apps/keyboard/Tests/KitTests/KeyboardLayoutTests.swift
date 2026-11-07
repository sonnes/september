import CoreGraphics
import SeptemberKit

func keyboardLayoutTests() {
    let rows = KeyboardLayout.rows

    test("key ids are unique so SwiftUI can identify them") {
        let ids = rows.flatMap { $0.keys.map(\.id) }
        expectEqual(Set(ids).count, ids.count)
    }

    test("VoiceOver hears the name of each special key, not its symbol") {
        let names = Dictionary(uniqueKeysWithValues: rows.flatMap(\.keys).map { ($0.id, $0.accessibilityLabel) })
        expectEqual(names["esc"], "Escape")
        expectEqual(names["f5"], "F5")
        expectEqual(names["fn"], "Function")
        expectEqual(names["capslock"], "Caps Lock")
        expectEqual(names["return"], "Return")
        expectEqual(names["delete"], "Delete")
        expectEqual(names["control"], "Control")
        expectEqual(names["option-left"], "Option")
        expectEqual(names["command-right"], "Command")
        expectEqual(names["key-q"], "Q")
    }

    test("VoiceOver hears the shifted symbol of a number-row key") {
        let one = rows.flatMap(\.keys).first { $0.id == "key-1" }
        expectEqual(one?.accessibilityLabel, "1, shift for !")
    }

    test("every row fills the width it is given") {
        for row in rows {
            let widths = KeyboardLayout.widths(for: row, totalWidth: 500, spacing: 4)
            let filled = widths.reduce(0, +) + 4 * CGFloat(row.keys.count - 1)
            expect(abs(filled - 500) < 0.001, "\(row.id) fills \(filled)")
        }
    }
}
