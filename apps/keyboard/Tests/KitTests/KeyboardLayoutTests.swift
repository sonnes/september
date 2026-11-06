import CoreGraphics
import SeptemberKit

func keyboardLayoutTests() {
    let rows = KeyboardLayout.rows

    test("key ids are unique so SwiftUI can identify them") {
        let ids = rows.flatMap { $0.keys.map(\.id) }
        expectEqual(Set(ids).count, ids.count)
    }

    test("every row fills the width it is given") {
        for row in rows {
            let widths = KeyboardLayout.widths(for: row, totalWidth: 500, spacing: 4)
            let filled = widths.reduce(0, +) + 4 * CGFloat(row.keys.count - 1)
            expect(abs(filled - 500) < 0.001, "\(row.id) fills \(filled)")
        }
    }
}
