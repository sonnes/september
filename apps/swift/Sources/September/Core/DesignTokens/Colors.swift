import AppKit
import SwiftUI

// MARK: - Design Token Colors
//
// All tokens adapt automatically to light/dark appearance via
// NSColor(name:dynamicProvider:). Values sourced from design-specifications.png.

enum DesignColors {

    // MARK: Semantic Tokens

    static let background = dynamicColor(light: 0xFFFFFF, dark: 0x0A0A0A)
    static let foreground = dynamicColor(light: 0x0A0A0A, dark: 0xFAFAFA)
    static let card = dynamicColor(light: 0xF4F4F5, dark: 0x18181B)
    static let primary = dynamicColor(light: 0xFF8400, dark: 0xFF8400)
    static let secondary = dynamicColor(light: 0xF4F4F5, dark: 0x27272A)
    static let muted = dynamicColor(light: 0xF4F4F5, dark: 0x27272A)
    static let mutedForeground = dynamicColor(light: 0x71717A, dark: 0xA1A1AA)
    static let border = dynamicColor(light: 0xE4E4E7, dark: 0x27272A)
    static let destructive = dynamicColor(light: 0xEF4444, dark: 0xEF4444)

    // MARK: Keyboard Tokens (from design-specifications.png)

    static let kbBackground = dynamicColor(light: 0xE8E8EC, dark: 0x1C1C1E)
    static let kbKey = dynamicColor(light: 0xFFFFFF, dark: 0x3A3A3C)
    static let kbKeySpecial = dynamicColor(light: 0xB8B8BF, dark: 0x2C2C2E)
    static let kbKeyText = dynamicColor(light: 0x1C1C1E, dark: 0xF2F2F7)
    static let kbKeyShadow = dynamicColor(light: (0x000000, 0.15), dark: (0x000000, 0.25))
    static let kbAccent = dynamicColor(light: 0x007AFF, dark: 0x0A84FF)

    // MARK: Sidebar Tokens

    static let sidebar = dynamicColor(light: 0xF4F4F5, dark: 0x18181B)
    static let sidebarAccent = dynamicColor(light: 0xFF8400, dark: 0xFF8400)
    static let sidebarForeground = dynamicColor(light: 0x0A0A0A, dark: 0xFAFAFA)
    static let sidebarBorder = dynamicColor(light: 0xE4E4E7, dark: 0x27272A)

    // MARK: Phase 1 — Key Component Tokens (light/dark from design spec)
    //
    // Light values derived from keyboard-light-rainbow.png and design-specifications.png.
    // Dark values from Issue #10 spec (#1A1A20, #141418, etc.).

    static let keyStandardFill = dynamicColor(light: 0xFFFFFF, dark: 0x1A1A20)
    static let keyStandardStroke = dynamicColor(light: (0x000000, 0.06), dark: (0xFFFFFF, 0.094))
    static let keyStandardShadow = dynamicColor(light: (0x000000, 0.08), dark: (0x000000, 0.25))
    static let keyStandardGlow = dynamicColor(light: (0xFFFFFF, 0.0), dark: (0xFFFFFF, 0.031))
    static let keyStandardLabel = dynamicColor(light: 0x1C1C1E, dark: 0xF0F0F5)

    static let keySpecialFill = dynamicColor(light: 0xD4D4D8, dark: 0x141418)
    static let keySpecialStroke = dynamicColor(light: (0x000000, 0.04), dark: (0xFFFFFF, 0.071))
    static let keySpecialLabel = dynamicColor(light: 0x52525B, dark: 0xA0A0B0)

    static let keyDualTopLabel = dynamicColor(light: 0x71717A, dark: 0x808090)
    static let keyDualBottomLabel = dynamicColor(light: 0x1C1C1E, dark: 0xF0F0F5)

    static let shortcutIcon = dynamicColor(light: 0x71717A, dark: 0x808090)
    static let shortcutLabel = dynamicColor(light: 0x3F3F46, dark: 0xC0C0CC)

    // MARK: Keyboard Dimensions

    static let kbCornerRadius: CGFloat = 6

    // MARK: - Helpers (RGB)

    private static func dynamicColor(light: UInt32, dark: UInt32) -> Color {
        Color(nsColor: NSColor(name: nil, dynamicProvider: { appearance in
            let name = appearance.bestMatch(from: [.aqua, .darkAqua])
            return name == .darkAqua ? nsColor(from: dark) : nsColor(from: light)
        }))
    }

    // MARK: - Helpers (RGB + separate alpha)

    private static func dynamicColor(
        light: (UInt32, Double),
        dark: (UInt32, Double)
    ) -> Color {
        Color(nsColor: NSColor(name: nil, dynamicProvider: { appearance in
            let name = appearance.bestMatch(from: [.aqua, .darkAqua])
            let (hex, alpha) = name == .darkAqua ? dark : light
            return nsColor(from: hex, alpha: alpha)
        }))
    }

    private static func nsColor(from hex: UInt32, alpha: Double = 1.0) -> NSColor {
        let r = CGFloat((hex >> 16) & 0xFF) / 255
        let g = CGFloat((hex >> 8) & 0xFF) / 255
        let b = CGFloat(hex & 0xFF) / 255
        return NSColor(red: r, green: g, blue: b, alpha: CGFloat(alpha))
    }
}
