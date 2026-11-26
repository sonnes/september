import CoreGraphics
import Foundation
import SeptemberKit

@MainActor
func keySizeTests() {
    test("the key size setting holds 48, 64, or 88 points, and the default is 48") {
        expectEqual(KeySize.allCases.map(\.points), [48, 64, 88])
        let defaults = freshDefaults()
        let settings = KeyboardSettings(defaults: defaults)
        expectEqual(settings.keySize, .regular)
        settings.keySize = .extraLarge
        expectEqual(KeyboardSettings(defaults: defaults).keySize, .extraLarge, "the setting keeps its value")
    }

    test("a key is the chosen size when the keys fit the screen") {
        expectEqual(KeySize.large.points(fitting: 2000, baseWidth: 1000), 64)
        expectEqual(KeySize.regular.points(fitting: 1000, baseWidth: 1000), 48)
    }

    test("a key is the largest size that fits the width of the screen") {
        // At 48 points the keys are 1000 wide, so 1500 fits 72 points.
        expectEqual(KeySize.extraLarge.points(fitting: 1500, baseWidth: 1000), 72)
        expectEqual(KeySize.regular.points(fitting: 900, baseWidth: 1000), 43)
    }

    test("the keyboard window scales by the key size over 48 points") {
        expectEqual(KeySize.regular.windowScale(fitting: 3000, baseWidth: 1000), 1)
        expectEqual(KeySize.large.windowScale(fitting: 3000, baseWidth: 1000), 64.0 / 48)
        expectEqual(KeySize.extraLarge.windowScale(fitting: 3000, baseWidth: 1000), 88.0 / 48)
    }

    test("the whole keyboard window scales to the largest key size that fits the screen") {
        // The whole window is 1000 wide at 48 points, so 1500 fits 72 points.
        expectEqual(KeySize.extraLarge.windowScale(fitting: 1500, baseWidth: 1000), 72.0 / 48)
        expectEqual(KeySize.regular.windowScale(fitting: 900, baseWidth: 1000), 43.0 / 48)
    }

    test("at 88 points the number row and the function row fold away") {
        let folded = KeyboardLayout.rows(keySize: .extraLarge).map(\.id)
        expect(!folded.contains(.number))
        expect(!folded.contains(.function))
        expect(folded.contains(.qwerty))
        expectEqual(KeyboardLayout.rows(keySize: .large).map(\.id), KeyboardLayout.rows.map(\.id))
    }

    test("each key size has a Delete key") {
        for size in KeySize.allCases {
            let keys = KeyboardLayout.rows(keySize: size).flatMap(\.keys)
            expect(keys.contains { $0.action == .virtual(.delete) }, "\(size) has no Delete key")
        }
    }

    test("at 88 points the panels fold away") {
        expect(!DetachedPanel.isShown(in: .type, keySize: .extraLarge))
        expect(DetachedPanel.isShown(in: .type, keySize: .large))
        expect(!DetachedPanel.isShown(in: .talk, keySize: .regular))
    }
}
