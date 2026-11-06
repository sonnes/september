import CoreGraphics
import Foundation

public enum Metrics {
    public static let keyCornerRadius: CGFloat = 6
    /// The surfaces that hold keys: the keyboard block, the screen, the viewer.
    public static let keyboardCornerRadius: CGFloat = 12
    public static let surfaceCornerRadius: CGFloat = 16
    public static let surfacePadding: CGFloat = 16
    /// How long a press lasts before a key starts to repeat.
    public static let holdDuration: TimeInterval = 0.4
    public static let keyRepeatInterval: TimeInterval = 0.08
    public static let pressAnimation: TimeInterval = 0.08
    public static let activeAnimation: TimeInterval = 0.12
    /// The gap between the stacked keypads on the right of the keyboard.
    public static let keypadStackSpacing: CGFloat = 12
    public static let rowSpacing: CGFloat = 3
    public static let sectionSpacing: CGFloat = 16
    public static let keyboardWidth: CGFloat = 980
    public static let keypadWidth: CGFloat = 200
    /// The accessibility tree viewer, which sits at the right edge of the
    /// screen and takes its height from the keyboard beside it.
    public static let treeViewerWidth: CGFloat = 320
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

    /// The QWERTY block and the accent line that marks each rainbow row.
    public enum Keyboard {
        public static let padding: CGFloat = 8
        public static let rowAccentWidth: CGFloat = 2
        public static let rowAccentOffset: CGFloat = -5
        public static let rowAccentOpacity: Double = 0.5
    }

    public enum Input {
        public static let height: CGFloat = 48
        public static let cornerRadius: CGFloat = 24
        public static let spacing: CGFloat = 12
        public static let horizontalPadding: CGFloat = 18
        /// The gap between typed text and the caret.
        public static let caretGap: CGFloat = 2
        public static let caret = CGSize(width: 1.5, height: 20)
        public static let caretBlink: TimeInterval = 0.6
    }

    public enum Banner {
        public static let height: CGFloat = 36
        public static let cornerRadius: CGFloat = 10
        public static let spacing: CGFloat = 10
        public static let horizontalPadding: CGFloat = 16
    }

    /// The keypads and the app shortcuts list.
    public enum Panel {
        /// The EDIT, NAVIGATE and SYSTEM keypads.
        public static let columns = 2
        public static let titleSpacing: CGFloat = 8
        public static let appSpacing: CGFloat = 6
        public static let appHeaderBottom: CGFloat = 2
        public static let appDot: CGFloat = 5
        public static let buttonSpacing: CGFloat = 6
        public static let buttonIcon: CGFloat = 14
        public static let rowSpacing: CGFloat = 8
        public static let rowIcon: CGFloat = 16
        public static let rowMinGap: CGFloat = 4
        public static let rowPadding: CGFloat = 8
    }

    public enum Tree {
        public static let padding: CGFloat = 12
        public static let spacing: CGFloat = 10
        public static let headerSpacing: CGFloat = 8
        public static let titleSpacing: CGFloat = 2
        public static let refreshButton: CGFloat = 28
        public static let rowGap: CGFloat = 1
        public static let listBottom: CGFloat = 8
        public static let columnSpacing: CGFloat = 6
        public static let indent: CGFloat = 10
        public static let disclosureWidth: CGFloat = 6
        public static let rowVerticalPadding: CGFloat = 2
        public static let rowHorizontalPadding: CGFloat = 4
        public static let rowCornerRadius: CGFloat = 4
    }

    public enum Gallery {
        public static let width: CGFloat = 1120
        public static let padding: CGFloat = 40
        public static let spacing: CGFloat = 28
        public static let headerSpacing: CGFloat = 6
        public static let columns = 3
        public static let columnWidth: CGFloat = 300
        public static let columnSpacing: CGFloat = 24
        public static let sampleSpacing: CGFloat = 16
        public static let noteSpacing: CGFloat = 4
        public static let noteWidth: CGFloat = 150
    }
}
