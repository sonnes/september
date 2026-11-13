import CoreGraphics
import Foundation

public enum Metrics {
    public static let keyCornerRadius: CGFloat = 6
    /// The surfaces that hold keys: the keyboard block, the screen, the viewer.
    public static let keyboardCornerRadius: CGFloat = 12
    public static let surfaceCornerRadius: CGFloat = 16
    public static let surfacePadding: CGFloat = 16
    public static let pressAnimation: TimeInterval = 0.08
    public static let activeAnimation: TimeInterval = 0.12
    public static let rowSpacing: CGFloat = 3
    public static let sectionSpacing: CGFloat = 16
    public static let keyboardWidth: CGFloat = 980
    /// The accessibility tree viewer, which sits at the right edge of the
    /// screen and takes its height from the keyboard beside it.
    public static let treeViewerWidth: CGFloat = 320
    public static let dualLabelGap: CGFloat = 2
    /// The bar under the label of a locked modifier key. It is not in the
    /// design system.
    public static let lockBarSize = CGSize(width: 12, height: 2)
    public static let dualSecondaryLabelSize: CGFloat = 11
    /// The dashes of the border of an empty slot in the word row.
    public static let emptySlotDash: [CGFloat] = [4, 3]

    public static func size(for kind: KeyKind) -> CGSize {
        switch kind {
        case .standard, .dual: CGSize(width: 48, height: 48)
        case .special: CGSize(width: 60, height: 48)
        case .function: CGSize(width: 60, height: 32)
        }
    }

    /// A special key with a symbol for its label, such as ⌘, as large as a
    /// letter.
    public static let symbolLabelSize: CGFloat = 18

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
        /// The shortcut suggestions that fit in the place of the bar: panel
        /// buttons with the gap of a panel between them.
        public static let shortcutCount = Int(
            (Metrics.keyboardWidth + Keypad.gap) / (Keypad.buttonWidth + Keypad.gap))
        public static let cornerRadius: CGFloat = 24
        public static let spacing: CGFloat = 12
        public static let horizontalPadding: CGFloat = 18
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

    /// The titles of the keypads.
    public enum Panel {
        public static let titleSpacing: CGFloat = 8
        /// The title of a keypad, such as "EDIT". The title and the gap under
        /// it are as tall as the tabs of the My Panel window and the gap
        /// under them. Then the buttons of the keypads and My Panel start at
        /// the same height, and System, Text, and My Panel end at the same
        /// height.
        public static let titleHeight: CGFloat =
            Metrics.Detached.tabHeight + Metrics.Detached.tabsBottom - titleSpacing
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
}
