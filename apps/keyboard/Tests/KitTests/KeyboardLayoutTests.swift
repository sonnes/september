import CoreGraphics
import SeptemberKit
import Testing

struct KeyboardLayoutTests {
    let rows = KeyboardLayout.rows

    @Test func `key ids are unique so SwiftUI can identify them`() throws {
        let ids = rows.flatMap { $0.keys.map(\.id) }
        #expect(Set(ids).count == ids.count)
    }

    @Test func `VoiceOver hears the name of each special key`() throws {
        let names = Dictionary(
            uniqueKeysWithValues: rows.flatMap(\.keys).map { ($0.id, $0.accessibilityLabel) })
        #expect(names["esc"] == "Escape")
        #expect(names["f5"] == "F5")
        #expect(names["fn"] == "Function")
        #expect(names["capslock"] == "Caps Lock")
        #expect(names["return"] == "Return")
        #expect(names["key-q"] == "Q")
    }

    @Test func `VoiceOver hears the shifted symbol of a number-row key`() throws {
        let one = try #require(rows.flatMap(\.keys).first { $0.id == "key-1" })
        #expect(one.accessibilityLabel == "1, shift for !")
    }

    @Test func `every row fills the width it is given`() throws {
        for row in rows {
            let widths = KeyboardLayout.widths(for: row, totalWidth: 500, spacing: 4)
            let filled = widths.reduce(0, +) + 4 * CGFloat(row.keys.count - 1)
            #expect(abs(filled - 500) < 0.001, "\(row.id) fills \(filled)")
        }
    }
}
