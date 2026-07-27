import CoreGraphics

/// The kind of key, which fixes its size and label treatment.
public enum KeyKind: Sendable, Hashable, CaseIterable {
    /// Alphanumeric key with a single label.
    case standard
    /// Modifier or utility key (shift, tab, delete, return, caps lock).
    case special
    /// Function row key (esc, F1–F12).
    case function
    /// Number row key with a secondary symbol above the primary label.
    case dual
}

/// Sizes and spacing from the keyboard design system.
public enum Metrics {
    public static let keyCornerRadius: CGFloat = 6
    public static let rowSpacing: CGFloat = 3
    public static let sectionSpacing: CGFloat = 16
    public static let keyboardWidth: CGFloat = 980
    public static let keypadWidth: CGFloat = 200
    public static let inputBarHeight: CGFloat = 48
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

    public static func labelSize(for kind: KeyKind) -> CGFloat {
        switch kind {
        case .standard: 18
        case .dual: 16
        case .special: 12
        case .function: 11
        }
    }
}
