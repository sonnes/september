import CoreGraphics

extension Metrics {
    /// The shortcut panels in windows of their own, from frame 1 of the
    /// keyboard predictions mock.
    public enum Detached {
        /// The gap between the keys and a panel, and between two panels.
        public static let gap: CGFloat = 24
        public static let cornerRadius: CGFloat = 14
        /// The padding of a panel card. The top holds the grip.
        public static let topPadding: CGFloat = 18
        public static let sidePadding: CGFloat = 12
        /// The keys card has less padding at the sides.
        public static let keysSidePadding: CGFloat = 8
        public static let grip = CGSize(width: 28, height: 4)
        public static let gripTop: CGFloat = 7
        public static let gripOpacity: Double = 0.35
        /// The gap between the tabs and the grid of the My Panel window.
        public static let tabsBottom: CGFloat = 8
        public static let tabSpacing: CGFloat = 4
        public static let tabHeight: CGFloat = 26
        public static let tabCornerRadius: CGFloat = 7
    }

    /// The input bar row: the bar, Speak, and the mode buttons.
    public enum TopRow {
        public static let spacing: CGFloat = 16
        /// The gap between the prediction stack and the bar.
        public static let stackBottom: CGFloat = 14
        /// The gap between the bar row and the keys.
        public static let keysTop: CGFloat = 16
        public static let modeSpacing: CGFloat = 12
        /// Settings stands a little apart from the modes.
        public static let settingsGap: CGFloat = 8
        public static let modeCircle: CGFloat = 44
        public static let modeLabelSpacing: CGFloat = 5
        public static let modeBorder: CGFloat = 1
        public static let modeBorderOn: CGFloat = 2
    }
}

extension Metrics {
    /// The keyboard window: the clipboard buttons, the bar, and the keys.
    public enum Screen {
        /// The distance from the left edge of the window to the keys and the
        /// bar. The clipboard buttons fit in this space. The app keeps the
        /// keys in place when the mode changes.
        public static func keysInset(_ mode: KeyboardMode) -> CGFloat {
            max(cardKeysInset(mode), clipboardReach)
        }

        /// The clear space at the left of the keys card in Type mode, or of
        /// the Talk card in Talk mode, under the clipboard buttons.
        public static func cardInset(_ mode: KeyboardMode) -> CGFloat {
            keysInset(mode) - cardKeysInset(mode)
        }

        public static let clipboardReach = Clipboard.buttonsWidth + TopRow.spacing

        private static func cardKeysInset(_ mode: KeyboardMode) -> CGFloat {
            switch mode {
            case .type: Detached.keysSidePadding
            case .talk: surfacePadding + Keypad.width + sectionSpacing
            }
        }
    }
}

extension Metrics.Keypad {
    /// The height of the grid. Mine and a message in place of a
    /// panel take the same height, so the window does not change size.
    public static let gridHeight: CGFloat = buttonHeight * CGFloat(rows) + gap * CGFloat(rows - 1)
}
