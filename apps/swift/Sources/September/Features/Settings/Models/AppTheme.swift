import AppKit

// MARK: - AppTheme
//
// User-selectable appearance theme. Applied via NSApp.appearance.
// System mode (nil) inherits from macOS settings and lets
// DesignColors dynamic providers resolve automatically.

enum AppTheme: String, CaseIterable, Sendable {
    case light
    case dark
    case system

    var nsAppearance: NSAppearance? {
        switch self {
        case .light: NSAppearance(named: .aqua)
        case .dark: NSAppearance(named: .darkAqua)
        case .system: nil
        }
    }

    var label: String {
        switch self {
        case .light: "Light"
        case .dark: "Dark"
        case .system: "System"
        }
    }

    var icon: String {
        switch self {
        case .light: "sun.max"
        case .dark: "moon"
        case .system: "circle.lefthalf.filled"
        }
    }
}
