import CoreGraphics
import Foundation

public enum Metrics {
    public static let keyCornerRadius: CGFloat = 6
    /// The surfaces that hold keys: the keyboard block, the screen, the viewer.
    public static let keyboardCornerRadius: CGFloat = 12
    public static let surfaceCornerRadius: CGFloat = 16
    public static let surfacePadding: CGFloat = 16
    public static let bannerCornerRadius: CGFloat = 10
    public static let bannerHeight: CGFloat = 36
    /// How long a press lasts before a key starts to repeat.
    public static let holdDuration: TimeInterval = 0.4
    public static let keyRepeatInterval: TimeInterval = 0.08
    public static let rowSpacing: CGFloat = 3
    public static let sectionSpacing: CGFloat = 16
    public static let keyboardWidth: CGFloat = 980
    public static let keypadWidth: CGFloat = 200
    public static let inputBarHeight: CGFloat = 48
    /// The accessibility tree viewer, which sits at the right edge of the
    /// screen and takes its height from the keyboard beside it.
    public static let treeViewerWidth: CGFloat = 320
    public static let inputBarCornerRadius: CGFloat = 24
    public static let dualLabelGap: CGFloat = 2
    public static let dualSecondaryLabelSize: CGFloat = 11

    public static let shortcutButton = CGSize(width: 120, height: 40)
    public static let shortcutFull = CGSize(width: 160, height: 36)

    public static func size(for kind: KeyKind) -> CGSize {
        switch kind {
        case .standard, .dual: CGSize(width: 48, height: 48)
        case .special: CGSize(width: 60, height: 48)
        case .function: CGSize(width: 60, height: 32)
        }
    }

    /// "48×48", as the component library writes a size.
    public static func describe(_ size: CGSize) -> String {
        "\(Int(size.width))×\(Int(size.height))"
    }

    public static func labelSize(for kind: KeyKind) -> CGFloat {
        switch kind {
        case .standard: 18
        case .dual: 16
        case .special: 12
        case .function: 11
        }
    }
}
