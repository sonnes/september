import SwiftUI

/// Keyboard visual style — 4 variants: Light/Dark × Rainbow/Mono.
/// Stored in @AppStorage for persistence.
enum KeyboardStyle: String, CaseIterable, Sendable {
    case lightRainbow
    case lightMono
    case darkRainbow
    case darkMono

    var isRainbow: Bool {
        self == .lightRainbow || self == .darkRainbow
    }

    /// Returns an accent color for the given row index (0-based).
    /// Returns nil for Mono styles (no accent tinting).
    ///
    /// Rainbow row mapping:
    ///   0 = function row  → red
    ///   1 = number row    → orange
    ///   2 = QWERTY row    → yellow
    ///   3 = home row      → green
    ///   4 = bottom row    → blue
    ///   5 = modifier row  → purple
    ///
    /// Light rainbow uses softer/darker tints for contrast on white keys.
    /// Dark rainbow uses brighter tints for contrast on dark keys.
    func accentColor(forRow row: Int) -> Color? {
        guard isRainbow else { return nil }

        switch self {
        case .darkRainbow:
            switch row {
            case 0: return Color(red: 1.0, green: 0.4, blue: 0.4)       // red
            case 1: return Color(red: 1.0, green: 0.6, blue: 0.2)       // orange
            case 2: return Color(red: 1.0, green: 0.8, blue: 0.3)       // yellow
            case 3: return Color(red: 0.4, green: 0.8, blue: 0.4)       // green
            case 4: return Color(red: 0.4, green: 0.6, blue: 1.0)       // blue
            case 5: return Color(red: 0.6, green: 0.4, blue: 1.0)       // purple
            default: return nil
            }
        case .lightRainbow:
            switch row {
            case 0: return Color(red: 0.85, green: 0.2, blue: 0.2)      // red
            case 1: return Color(red: 0.85, green: 0.45, blue: 0.0)     // orange
            case 2: return Color(red: 0.7, green: 0.55, blue: 0.0)      // yellow/gold
            case 3: return Color(red: 0.2, green: 0.65, blue: 0.2)      // green
            case 4: return Color(red: 0.2, green: 0.4, blue: 0.85)      // blue
            case 5: return Color(red: 0.45, green: 0.25, blue: 0.8)     // purple
            default: return nil
            }
        default:
            return nil
        }
    }
}
