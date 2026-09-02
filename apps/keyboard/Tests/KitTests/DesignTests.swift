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

    test("the mirrored selection is the accent, dimmed") {
        for theme in [Tokens.selection.dark: Tokens.accent.dark, Tokens.selection.light: Tokens.accent.light] {
            expectEqual(theme.key.red, theme.value.red)
            expectEqual(theme.key.green, theme.value.green)
            expectEqual(theme.key.blue, theme.value.blue)
            expect(theme.key.alpha < 1)
        }
    }

    test("tokens parse hex with and without alpha") {
        expectEqual(Tokens.key.dark, RGBA(red: 26 / 255, green: 26 / 255, blue: 32 / 255))
        expectEqual(Tokens.strokeStandard.dark.alpha, 24 / 255)
        expectEqual(Tokens.keyShadow.dark.alpha, 64 / 255)
    }

    test("a theme colour resolves by appearance") {
        let pair = ThemeColor(light: RGBA(hex: 0xFFFFFF), dark: RGBA(hex: 0x000000))
        expectEqual(pair.resolved(dark: true), RGBA(hex: 0x000000))
        expectEqual(pair.resolved(dark: false), RGBA(hex: 0xFFFFFF))
    }

    test("luminance and contrast follow WCAG") {
        expectEqual(RGBA(hex: 0xFFFFFF).relativeLuminance, 1)
        expectEqual(RGBA(hex: 0x000000).relativeLuminance, 0)
        expectEqual(RGBA(hex: 0xFFFFFF).contrastRatio(with: RGBA(hex: 0x000000)), 21)
    }

    test("a pressed key moves away from its surface, whichever theme is on") {
        let pressed = Tokens.key.pressed
        expect(pressed.dark.relativeLuminance > Tokens.key.dark.relativeLuminance, "dark keys lift")
        expect(
            pressed.light.relativeLuminance < Tokens.key.light.relativeLuminance,
            "light keys sink")
    }

    test("the light theme is light and the dark theme is dark") {
        expect(Tokens.background.light.relativeLuminance > 0.7)
        expect(Tokens.background.dark.relativeLuminance < 0.1)
        expect(Tokens.key.light.relativeLuminance > 0.7)
        expect(Tokens.key.dark.relativeLuminance < 0.1)
    }

    test("key labels stay readable in both themes") {
        for dark in [true, false] {
            let key = Tokens.key.resolved(dark: dark)
            expect(
                Tokens.keyText.resolved(dark: dark).contrastRatio(with: key) >= 4.5,
                "key text, dark: \(dark)")
            expect(
                Tokens.shortcutLabel.resolved(dark: dark).contrastRatio(with: key) >= 3,
                "shortcut labels, dark: \(dark)")
            expect(
                Tokens.labelSecondary.resolved(dark: dark).contrastRatio(with: key) >= 3,
                "secondary labels, dark: \(dark)")
        }
    }

    test("the accent reads on the surface behind it") {
        for dark in [true, false] {
            expect(
                Tokens.accent.resolved(dark: dark)
                    .contrastRatio(with: Tokens.background.resolved(dark: dark)) >= 3,
                "accent, dark: \(dark)")
        }
    }

    test("section labels are no worse in light than the design system is in dark") {
        // #606070 on #1C1C1E is 2.8:1 — under WCAG 3:1, but it is the design
        // system's own value, so the dark column keeps it. The light column,
        // which we chose, has to clear the bar.
        let onDark = Tokens.sectionLabel.dark.contrastRatio(with: Tokens.background.dark)
        let onLight = Tokens.sectionLabel.light.contrastRatio(with: Tokens.background.light)
        expect(onLight >= 3, "light section labels measured \(onLight)")
        expect(onLight >= onDark)
    }

    test("rainbow tints every row differently, in both themes") {
        for dark in [true, false] {
            let tints = KeyboardRow.allCases.map {
                KeyboardStyle.rainbow.tint(for: $0).resolved(dark: dark)
            }
            expectEqual(Set(tints).count, KeyboardRow.allCases.count)
        }
    }

    test("rainbow key labels keep their contrast on light keys") {
        for row in KeyboardRow.allCases {
            let tint = KeyboardStyle.rainbow.tint(for: row)
            expect(
                tint.light.contrastRatio(with: Tokens.key.light) >= 3,
                "\(row) on a light key")
            expect(
                tint.dark.contrastRatio(with: Tokens.key.dark) >= 3,
                "\(row) on a dark key")
        }
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
