import CoreGraphics

extension Metrics {
    /// The keypads, Mine, and the Write panels: buttons that show only their
    /// keys, in two columns, or in three for System and the arrows of Text.
    public enum Keypad {
        public static let width: CGFloat = 150
        public static let gap: CGFloat = 6
        public static let buttonHeight: CGFloat = 44
        public static let buttonWidth: CGFloat = (width - gap) / 2
        /// A keypad with three columns.
        public static let arrowsWidth: CGFloat = buttonWidth * 3 + gap * 2
        public static let cornerRadius: CGFloat = 8
        /// The icon of a button that places a window: a small screen with
        /// the part of the window filled.
        public static let regionIcon = CGSize(width: 26, height: 18)
        public static let regionIconCornerRadius: CGFloat = 3
        public static let regionIconStroke: CGFloat = 1.25
        /// The space between the edge of the screen and the filled part.
        public static let regionIconInset: CGFloat = 2.5
        public static let regionCornerRadius: CGFloat = 1.5
        /// Long keys, such as a sequence, shrink to fit the button.
        public static let keysMinimumScale: CGFloat = 0.7
        public static let emptySlotDash: CGFloat = 3
        public static let textPadding: CGFloat = 8

        /// The name that shows above a button under the pointer.
        public static let tipGap: CGFloat = 8
        public static let tipHorizontalPadding: CGFloat = 10
        public static let tipVerticalPadding: CGFloat = 6
        public static let tipCornerRadius: CGFloat = 8
        public static let tipArrow = CGSize(width: 10, height: 5)
        public static let tipShadowRadius: CGFloat = 6
        public static let tipShadowY: CGFloat = 4
    }
}
