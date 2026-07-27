import CoreGraphics
import SeptemberKit

func designTests() {
    test("each key kind has the size from the design system") {
        expectEqual(Metrics.size(for: .standard), CGSize(width: 48, height: 48))
        expectEqual(Metrics.size(for: .special), CGSize(width: 60, height: 48))
        expectEqual(Metrics.size(for: .function), CGSize(width: 60, height: 32))
        expectEqual(Metrics.size(for: .dual), CGSize(width: 48, height: 48))
    }

    test("shortcut components have the size from the design system") {
        expectEqual(Metrics.shortcutButton, CGSize(width: 120, height: 40))
        expectEqual(Metrics.shortcutFull, CGSize(width: 160, height: 36))
    }

    test("assembly metrics") {
        expectEqual(Metrics.keyboardWidth, 980)
        expectEqual(Metrics.keypadWidth, 200)
        expectEqual(Metrics.inputBarHeight, 48)
        expectEqual(Metrics.rowSpacing, 3)
        expectEqual(Metrics.sectionSpacing, 16)
        expectEqual(Metrics.keyCornerRadius, 6)
    }

    test("label sizes per key kind") {
        expectEqual(Metrics.labelSize(for: .standard), 18)
        expectEqual(Metrics.labelSize(for: .special), 12)
        expectEqual(Metrics.labelSize(for: .function), 11)
        expectEqual(Metrics.labelSize(for: .dual), 16)
        expectEqual(Metrics.dualSecondaryLabelSize, 11)
    }

    test("tokens parse hex with and without alpha") {
        expectEqual(Tokens.key, RGBA(red: 26 / 255, green: 26 / 255, blue: 32 / 255))
        expectEqual(Tokens.strokeStandard.alpha, 24 / 255)
        expectEqual(Tokens.keyShadow.alpha, 64 / 255)
    }

    test("rainbow tints every row differently") {
        let tints = KeyboardRow.allCases.map { KeyboardStyle.rainbow.tint(for: $0) }
        expectEqual(Set(tints).count, KeyboardRow.allCases.count)
    }

    test("mono uses the neutral key text colour for every row") {
        for row in KeyboardRow.allCases {
            expectEqual(KeyboardStyle.mono.tint(for: row), Tokens.keyText)
        }
    }

    test("only rainbow draws the row edge accent") {
        expect(KeyboardStyle.rainbow.drawsRowAccent)
        expect(!KeyboardStyle.mono.drawsRowAccent)
    }
}
