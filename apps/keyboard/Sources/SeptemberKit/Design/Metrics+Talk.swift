import CoreGraphics

extension Metrics {
    /// Talk mode: the Phrases panel, the Said list, and the Talk bar.
    public enum Talk {
        public static let saidRowCornerRadius: CGFloat = 8

        public static let saidWidth: CGFloat = 432
        public static let saidRowMinHeight: CGFloat = 48
        public static let saidRowSpacing: CGFloat = 6
        public static let saidRowGap: CGFloat = 10
        public static let saidRowVerticalPadding: CGFloat = 8
        public static let saidRowHorizontalPadding: CGFloat = 10
        /// The list shows the newest lines that fit beside the keys.
        public static let saidVisibleRows = 5

        /// The accent border that shows that the text is in the keyboard.
        public static let barBorder: CGFloat = 2
        public static let chipCornerRadius: CGFloat = 10
        public static let chipVerticalPadding: CGFloat = 3
        public static let chipHorizontalPadding: CGFloat = 8
        public static let wordHighlightCornerRadius: CGFloat = 4
    }
}
