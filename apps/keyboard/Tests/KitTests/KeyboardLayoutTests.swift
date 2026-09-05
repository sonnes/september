import CoreGraphics
import SeptemberKit

func keyboardLayoutTests() {
    let rows = KeyboardLayout.rows

    test("keys dispatch character, modifier, and virtual actions") {
        let keys = rows.flatMap(\.keys)
        expectEqual(keys.first { $0.id == "key-a" }?.action, .character("a"))
        expectEqual(keys.first { $0.id == "shift-left" }?.action, .modifier(.shift))
        expectEqual(keys.first { $0.id == "esc" }?.action, .virtual(.escape))
    }

    test("every key has an accessibility name") {
        for row in rows {
            for key in row.keys {
                expect(!key.accessibilityLabel.isEmpty, "\(key.id) has no accessibility label")
            }
        }
    }

    test("key ids are unique so SwiftUI can identify them") {
        let ids = rows.flatMap { $0.keys.map(\.id) }
        expectEqual(Set(ids).count, ids.count)
    }
}
