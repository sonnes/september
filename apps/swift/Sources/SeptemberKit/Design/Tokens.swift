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
}

/// Dark-theme tokens from the keyboard design system.
public enum Tokens {
    public static let background = RGBA(hex: 0x1C1C1E)
    public static let key = RGBA(hex: 0x1A1A20)
    public static let keySpecial = RGBA(hex: 0x141418)
    public static let keyText = RGBA(hex: 0xF0F0F5)
    public static let labelSecondary = RGBA(hex: 0xA0A0B0)
    public static let dualSecondary = RGBA(hex: 0x808090)
    public static let shortcutLabel = RGBA(hex: 0xC0C0CC)
    public static let accent = RGBA(hex: 0x0A84FF)

    public static let strokeStandard = RGBA(hex8: 0xFFFFFF18)
    public static let strokeSpecial = RGBA(hex8: 0xFFFFFF12)
    public static let keyShadow = RGBA(hex8: 0x00000040)
    public static let keyGlow = RGBA(hex8: 0xFFFFFF08)

    /// Panel chrome — the surrounding surfaces in the mock, one step below the keys.
    public static let panelBackground = RGBA(hex: 0x0F0F12)
    public static let panelStroke = RGBA(hex8: 0xFFFFFF0F)
    public static let sectionLabel = RGBA(hex: 0x606070)
}
