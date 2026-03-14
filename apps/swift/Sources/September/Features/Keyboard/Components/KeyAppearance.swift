import SwiftUI

/// Visual configuration for a key component. Used by KeyBase to render
/// the correct dimensions, colors, and effects per key type.
struct KeyAppearance {
    let width: CGFloat
    let height: CGFloat
    let fillColor: Color
    let strokeColor: Color
    let labelFont: Font
    let labelColor: Color
    let shadowRadius: CGFloat
    let shadowY: CGFloat
    let glowRadius: CGFloat
    let glowOpacity: Double

    // MARK: - Factory Methods (from Issue #10 design spec)

    /// 48×48pt alphanumeric key. Fill #1A1A20, label 18pt #F0F0F5.
    static func standard(width: CGFloat = 48) -> KeyAppearance {
        KeyAppearance(
            width: width,
            height: 48,
            fillColor: DesignColors.keyStandardFill,
            strokeColor: DesignColors.keyStandardStroke,
            labelFont: Typography.keyLabel(),
            labelColor: DesignColors.keyStandardLabel,
            shadowRadius: 1,
            shadowY: 1,
            glowRadius: 8,
            glowOpacity: 0.031
        )
    }

    /// 60×48pt modifier key. Fill #141418, label 12pt #A0A0B0.
    static func special(width: CGFloat = 60) -> KeyAppearance {
        KeyAppearance(
            width: width,
            height: 48,
            fillColor: DesignColors.keySpecialFill,
            strokeColor: DesignColors.keySpecialStroke,
            labelFont: Typography.specialKeyLabel(),
            labelColor: DesignColors.keySpecialLabel,
            shadowRadius: 1,
            shadowY: 1,
            glowRadius: 0,
            glowOpacity: 0
        )
    }

    /// 60×32pt function row key. Fill #141418, label 11pt medium #A0A0B0.
    static func function(width: CGFloat = 60) -> KeyAppearance {
        KeyAppearance(
            width: width,
            height: 32,
            fillColor: DesignColors.keySpecialFill,
            strokeColor: DesignColors.keySpecialStroke,
            labelFont: Typography.functionKeyLabel(),
            labelColor: DesignColors.keySpecialLabel,
            shadowRadius: 1,
            shadowY: 1,
            glowRadius: 0,
            glowOpacity: 0
        )
    }

    /// 48×48pt dual-label key (number row). Uses separate label colors for top/bottom.
    static func dual(width: CGFloat = 48) -> KeyAppearance {
        KeyAppearance(
            width: width,
            height: 48,
            fillColor: DesignColors.keyStandardFill,
            strokeColor: DesignColors.keyStandardStroke,
            labelFont: .system(size: 16),
            labelColor: DesignColors.keyDualBottomLabel,
            shadowRadius: 1,
            shadowY: 1,
            glowRadius: 8,
            glowOpacity: 0.031
        )
    }

    /// Create the appropriate appearance for a KeyDefinition.
    static func forKey(_ key: KeyDefinition) -> KeyAppearance {
        let w = key.width.rawValue
        switch key.keyType {
        case .standard: return .standard(width: w)
        case .special: return .special(width: w)
        case .function: return .function(width: w)
        case .dual: return .dual(width: w)
        }
    }
}
