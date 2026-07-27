import Foundation

/// A colour as plain components so tokens stay comparable in tests.
public struct RGBA: Equatable, Hashable, Sendable {
    public let red: Double
    public let green: Double
    public let blue: Double
    public let alpha: Double

    public init(red: Double, green: Double, blue: Double, alpha: Double = 1) {
        self.red = red
        self.green = green
        self.blue = blue
        self.alpha = alpha
    }

    /// `0xRRGGBB`.
    public init(hex: UInt32, alpha: Double = 1) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            alpha: alpha
        )
    }

    /// `0xRRGGBBAA`, matching the `#FFFFFF18` notation in the design system.
    public init(hex8: UInt32) {
        self.init(
            hex: (hex8 >> 8) & 0xFFFFFF,
            alpha: Double(hex8 & 0xFF) / 255
        )
    }

    /// WCAG relative luminance — the basis for every contrast check.
    public var relativeLuminance: Double {
        func channel(_ value: Double) -> Double {
            value <= 0.03928 ? value / 12.92 : pow((value + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
    }

    /// WCAG contrast, 1 (identical) to 21 (black on white).
    public func contrastRatio(with other: RGBA) -> Double {
        let a = relativeLuminance
        let b = other.relativeLuminance
        return (max(a, b) + 0.05) / (min(a, b) + 0.05)
    }
}

/// One token in both appearances. September follows the system setting, so
/// every colour has to answer for itself in light and in dark.
public struct ThemeColor: Equatable, Hashable, Sendable {
    public let light: RGBA
    public let dark: RGBA

    public init(light: RGBA, dark: RGBA) {
        self.light = light
        self.dark = dark
    }

    /// The same colour in both appearances — for the few that need no change.
    public init(_ both: RGBA) {
        self.init(light: both, dark: both)
    }

    public func resolved(dark isDark: Bool) -> RGBA { isDark ? dark : light }

    public func opacity(_ value: Double) -> ThemeColor {
        ThemeColor(light: light.opacity(value), dark: dark.opacity(value))
    }

    /// The surface under a finger. A dark key lifts towards the light, a light
    /// key sinks towards the dark — the same "something happened" either way.
    public var pressed: ThemeColor {
        ThemeColor(light: light.shifted(by: -0.06), dark: dark.shifted(by: 0.08))
    }
}

extension RGBA {
    public func opacity(_ value: Double) -> RGBA {
        RGBA(red: red, green: green, blue: blue, alpha: value)
    }

    /// Moves every channel towards white (positive) or black (negative).
    public func shifted(by amount: Double) -> RGBA {
        RGBA(
            red: min(max(red + amount, 0), 1),
            green: min(max(green + amount, 0), 1),
            blue: min(max(blue + amount, 0), 1),
            alpha: alpha
        )
    }
}

/// Tokens from the keyboard design system.
///
/// The dark values are the design system's own (issue #10). It defines no light
/// appearance, so the light column mirrors each dark value's role rather than
/// its hex — surfaces invert, text inverts, and every pairing is held to a WCAG
/// contrast floor by the tests in `DesignTests`.
public enum Tokens {
    public static let background = ThemeColor(light: RGBA(hex: 0xEDEDF2), dark: RGBA(hex: 0x1C1C1E))
    public static let key = ThemeColor(light: RGBA(hex: 0xFFFFFF), dark: RGBA(hex: 0x1A1A20))
    public static let keySpecial = ThemeColor(light: RGBA(hex: 0xE4E4EC), dark: RGBA(hex: 0x141418))
    public static let keyText = ThemeColor(light: RGBA(hex: 0x1C1C22), dark: RGBA(hex: 0xF0F0F5))
    public static let labelSecondary = ThemeColor(
        light: RGBA(hex: 0x5A5A66), dark: RGBA(hex: 0xA0A0B0))
    public static let dualSecondary = ThemeColor(
        light: RGBA(hex: 0x6E6E7A), dark: RGBA(hex: 0x808090))
    public static let shortcutLabel = ThemeColor(
        light: RGBA(hex: 0x3C3C46), dark: RGBA(hex: 0xC0C0CC))
    public static let accent = ThemeColor(light: RGBA(hex: 0x0064D2), dark: RGBA(hex: 0x0A84FF))

    /// The selection the focused field reports, drawn behind the mirrored text.
    /// Not in the design system — the accent, dimmed enough to read through.
    public static let selection = ThemeColor(
        light: RGBA(hex: 0x0064D2, alpha: 0.24), dark: RGBA(hex8: 0x0A84FF4D))

    /// Warnings — the permission banner.
    public static let warning = ThemeColor(light: RGBA(hex: 0xB25000), dark: RGBA(hex: 0xFF9F4A))
    public static let warningSurface = ThemeColor(
        light: RGBA(hex: 0xB25000, alpha: 0.12), dark: RGBA(hex: 0xFF9F4A, alpha: 0.12))
    /// The dot beside the app September is typing into.
    public static let positive = ThemeColor(light: RGBA(hex: 0x1B8A55), dark: RGBA(hex: 0x5CD6A0))

    /// Strokes and shadows are the light against dark, dark against light.
    public static let strokeStandard = ThemeColor(
        light: RGBA(hex8: 0x00000018), dark: RGBA(hex8: 0xFFFFFF18))
    public static let strokeSpecial = ThemeColor(
        light: RGBA(hex8: 0x00000012), dark: RGBA(hex8: 0xFFFFFF12))
    public static let keyShadow = ThemeColor(
        light: RGBA(hex8: 0x00000018), dark: RGBA(hex8: 0x00000040))
    public static let keyGlow = ThemeColor(
        light: RGBA(hex8: 0xFFFFFF00), dark: RGBA(hex8: 0xFFFFFF08))

    /// Panel chrome — the surrounding surfaces in the mock, one step below the keys.
    public static let panelBackground = ThemeColor(
        light: RGBA(hex: 0xF7F7FA), dark: RGBA(hex: 0x0F0F12))
    public static let panelStroke = ThemeColor(
        light: RGBA(hex8: 0x0000000F), dark: RGBA(hex8: 0xFFFFFF0F))
    public static let sectionLabel = ThemeColor(
        light: RGBA(hex: 0x6A6A76), dark: RGBA(hex: 0x606070))
}
