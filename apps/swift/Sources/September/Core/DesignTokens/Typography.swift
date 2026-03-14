import SwiftUI

// MARK: - Typography
//
// Primary: JetBrains Mono (monospaced, used for keyboard labels and code)
// Secondary: Geist (sans-serif, used for UI text)
//
// Falls back to system fonts if custom fonts are not installed.
// Font bundling will be added when the keyboard UI is built.

enum Typography {

    static let primaryFontName = "JetBrains Mono"
    static let secondaryFontName = "Geist"

    // MARK: Semantic Styles

    static func title(_ size: CGFloat = 24) -> Font {
        secondary(size: size, weight: .bold)
    }

    static func heading(_ size: CGFloat = 18) -> Font {
        secondary(size: size, weight: .semibold)
    }

    static func body(_ size: CGFloat = 14) -> Font {
        secondary(size: size, weight: .regular)
    }

    static func caption(_ size: CGFloat = 12) -> Font {
        secondary(size: size, weight: .regular)
    }

    // MARK: Keyboard-Specific (from design-specifications.png)

    /// Standard key label: size 18, regular weight
    static func keyLabel(_ size: CGFloat = 18) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }

    /// Special key label: size 12, regular weight
    static func specialKeyLabel(_ size: CGFloat = 12) -> Font {
        .system(size: size, weight: .regular, design: .default)
    }

    /// Function key label: size 11, medium weight
    static func functionKeyLabel(_ size: CGFloat = 11) -> Font {
        .system(size: size, weight: .medium, design: .default)
    }

    /// Monospaced text (input bar, code)
    static func mono(_ size: CGFloat = 14) -> Font {
        primary(size: size, weight: .regular)
    }

    // MARK: - Font Builders

    private static let isPrimaryAvailable = NSFontManager.shared
        .availableMembers(ofFontFamily: primaryFontName) != nil
    private static let isSecondaryAvailable = NSFontManager.shared
        .availableMembers(ofFontFamily: secondaryFontName) != nil

    private static func primary(size: CGFloat, weight: Font.Weight) -> Font {
        if isPrimaryAvailable {
            return .custom(primaryFontName, size: size).weight(weight)
        }
        return .system(size: size, weight: weight, design: .monospaced)
    }

    private static func secondary(size: CGFloat, weight: Font.Weight) -> Font {
        if isSecondaryAvailable {
            return .custom(secondaryFontName, size: size).weight(weight)
        }
        return .system(size: size, weight: weight, design: .default)
    }
}
