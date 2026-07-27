import CoreGraphics
import SeptemberKit

func keyboardLayoutTests() {
    let rows = KeyboardLayout.rows

    test("the keyboard has the six rows of the design mock, in order") {
        expectEqual(rows.map(\.id), [.function, .number, .qwerty, .home, .shift, .bottom])
    }

    test("function row is esc plus F1–F12") {
        let function = rows[0]
        expectEqual(function.keys.map(\.label), ["esc"] + (1...12).map { "F\($0)" })
        expect(function.keys.allSatisfy { $0.kind == .function })
    }

    test("number row is 13 dual keys from ` to = plus delete") {
        let number = rows[1]
        expectEqual(number.keys.count, 14)
        expectEqual(number.keys.prefix(13).map(\.label), ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="])
        expectEqual(
            number.keys.prefix(13).compactMap(\.secondaryLabel),
            ["~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+"]
        )
        expect(number.keys.prefix(13).allSatisfy { $0.kind == .dual })
        expectEqual(number.keys.last?.label, "delete")
        expectEqual(number.keys.last?.kind, .special)
    }

    test("letter rows carry the QWERTY order") {
        expectEqual(
            rows[2].keys.map(\.label),
            ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"]
        )
        expectEqual(
            rows[3].keys.map(\.label),
            ["caps lock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "return"]
        )
        expectEqual(
            rows[4].keys.map(\.label),
            ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "shift"]
        )
    }

    test("bottom row is the modifier cluster around the space bar") {
        expectEqual(
            rows[5].keys.map(\.label),
            ["fn", "control", "option", "command", "space", "command", "option"]
        )
    }

    test("every row fills exactly the keyboard width once spacing is removed") {
        for row in rows {
            let widths = KeyboardLayout.widths(for: row)
            expectEqual(widths.count, row.keys.count)
            let spacing = Metrics.rowSpacing * CGFloat(row.keys.count - 1)
            let total = widths.reduce(0, +) + spacing
            expect(
                abs(total - Metrics.keyboardWidth) < 0.01,
                "row \(row.id) totals \(total), expected \(Metrics.keyboardWidth)"
            )
        }
    }

    test("wide keys are wider than the keys beside them") {
        let bottom = rows[5]
        let widths = KeyboardLayout.widths(for: bottom)
        let spaceIndex = bottom.keys.firstIndex { $0.label == "space" }!
        expect(widths[spaceIndex] > widths[0] * 4, "space bar should dominate its row")

        let shiftRow = rows[4]
        let shiftWidths = KeyboardLayout.widths(for: shiftRow)
        expect(shiftWidths[0] > shiftWidths[1], "shift is wider than Z")
    }

    test("letters type characters and modifiers latch") {
        let a = rows[3].keys[1]
        expectEqual(a.action, .character("a"))
        let shift = rows[4].keys[0]
        expectEqual(shift.action, .modifier(.shift))
        let esc = rows[0].keys[0]
        expectEqual(esc.action, .virtual(.escape))
    }

    test("every key has an accessibility label spelling out what it does") {
        for row in rows {
            for key in row.keys {
                expect(!key.accessibilityLabel.isEmpty, "\(key.id) has no accessibility label")
            }
        }
        let shift = rows[4].keys[0]
        expectEqual(shift.accessibilityLabel, "Shift")
        expectEqual(rows[3].keys[1].accessibilityLabel, "A")
        expectEqual(rows[1].keys[1].accessibilityLabel, "1, shift for !")
    }

    test("key ids are unique so SwiftUI can identify them") {
        let ids = rows.flatMap { $0.keys.map(\.id) }
        expectEqual(Set(ids).count, ids.count)
    }
}
