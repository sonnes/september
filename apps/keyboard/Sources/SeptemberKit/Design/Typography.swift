import SwiftUI

/// Every font outside the keys. Key labels take their sizes from `Metrics`.
public enum Typography {
    public static let sectionLabel = Font.system(size: 9, weight: .semibold)
    public static let sectionTracking: CGFloat = 1.2

    public static let inputText = Font.system(size: 16)
    public static let inputIcon = Font.system(size: 15)
    public static let inputPlaceholder = Font.system(size: 14)

    public static let bannerText = Font.system(size: 12)
    public static let bannerAction = Font.system(size: 12, weight: .medium)

    public static let shortcutButtonIcon = Font.system(size: 14)
    public static let shortcutButtonText = Font.system(size: 11, weight: .medium)
    public static let shortcutRowIcon = Font.system(size: 12)
    public static let shortcutRowText = Font.system(size: 10)
    public static let appIcon = Font.system(size: 12)
    public static let appName = Font.system(size: 11, weight: .medium)

    public static let treeTitle = Font.system(size: 13, weight: .medium)
    public static let treeRefreshIcon = Font.system(size: 12, weight: .medium)
    public static let treeMessage = Font.system(size: 12)
    public static let treeDisclosure = Font.system(size: 8)
    public static let treeText = Font.system(size: 11)
    public static let treeCount = Font.system(size: 10, design: .monospaced)
    public static func treeRole(focused: Bool) -> Font {
        .system(size: 11, weight: focused ? .semibold : .regular, design: .monospaced)
    }

    public static let galleryTitle = Font.system(size: 24, weight: .semibold, design: .monospaced)
    public static let galleryCaption = Font.system(size: 12)
    public static let gallerySampleTitle = Font.system(size: 12, weight: .medium, design: .monospaced)
    public static let galleryNote = Font.system(size: 10)

    public static func keyLabel(_ kind: KeyKind) -> Font {
        .system(size: Metrics.labelSize(for: kind), weight: kind == .function ? .medium : .regular)
    }
    public static let keySecondaryLabel = Font.system(size: Metrics.dualSecondaryLabelSize)
}
