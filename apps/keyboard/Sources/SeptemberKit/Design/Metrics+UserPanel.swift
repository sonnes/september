import CoreGraphics

extension Metrics {
    /// Mine, the My Panel settings page, and the import window. From frame 3
    /// of the mock.
    public enum UserPanel {
        /// The grid of Mine, as wide as a keypad.
        public static let width: CGFloat = 150
        public static let buttonHeight: CGFloat = 44
        public static let cornerRadius: CGFloat = 8
        public static let spacing: CGFloat = 6
        /// The gap between the lock and the name of a private button.
        public static let lockSpacing: CGFloat = 6
        public static let textPadding: CGFloat = 8
        public static let emptyDash: [CGFloat] = [4, 3]
        /// A long sequence shrinks to fit, down to this scale.
        public static let keysMinimumScale: CGFloat = 0.7

        /// The keys chip at the start of a settings row.
        public static let chipMinWidth: CGFloat = 64
        public static let chipCornerRadius: CGFloat = 6
        public static let chipHorizontalPadding: CGFloat = 8
        public static let chipVerticalPadding: CGFloat = 3
        public static let rowSpacing: CGFloat = 12
        public static let rowDetailSpacing: CGFloat = 2
        public static let actionSpacing: CGFloat = 8

        public static let importWidth: CGFloat = 520
        public static let sheetWidth: CGFloat = 420
        public static let sheetPadding: CGFloat = 20
    }
}
