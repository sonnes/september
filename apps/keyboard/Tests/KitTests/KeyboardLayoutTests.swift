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
        expectEqual(names["control-left"], "Control")
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

    test("each row is 16 units wide, as on a Keychron K2") {
        for row in rows {
            let units = row.keys.reduce(0) { $0 + $1.weight }
            expect(abs(units - 16) < 0.001, "\(row.id) is \(units) units")
        }
    }

    test("the keys of the right column line up from row to row") {
        func edges(_ id: String) -> (left: CGFloat, right: CGFloat) {
            let row = rows.first { $0.keys.contains { $0.id == id } }!
            let widths = KeyboardLayout.widths(for: row, totalWidth: 980, spacing: 3)
            let index = row.keys.firstIndex { $0.id == id }!
            let left = widths[..<index].reduce(0, +) + 3 * CGFloat(index)
            return (left, left + widths[index])
        }
        let column = ["lock-screen", "home", "page-up", "page-down", "end", "arrow-right"].map(edges)
        for edge in column {
            expect(abs(edge.left - column[0].left) < 0.001, "left \(edge.left)")
            expect(abs(edge.right - 980) < 0.001, "right \(edge.right)")
        }
        expect(abs(edges("arrow-up").left - edges("arrow-down").left) < 0.001)
        expect(abs(edges("arrow-up").right - edges("arrow-down").right) < 0.001)
    }

    test("VoiceOver hears the name of each key of the K2 layout") {
        let names = Dictionary(uniqueKeysWithValues: rows.flatMap(\.keys).map { ($0.id, $0.accessibilityLabel) })
        expectEqual(names["home"], "Home")
        expectEqual(names["end"], "End")
        expectEqual(names["page-up"], "Page Up")
        expectEqual(names["page-down"], "Page Down")
        expectEqual(names["forward-delete"], "Forward Delete")
        expectEqual(names["arrow-left"], "Left Arrow")
        expectEqual(names["arrow-up"], "Up Arrow")
        expectEqual(names["screenshot"], "Screenshot")
        expectEqual(names["lock-screen"], "Lock Screen")
        expectEqual(names["control-right"], "Control")
    }

    test("only the Lock Screen key acts when the button comes up") {
        let released = rows.flatMap(\.keys).filter(\.actsOnRelease).map(\.id)
        expectEqual(released, ["lock-screen"])
    }
}
