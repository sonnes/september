import CoreGraphics

extension Metrics {
    /// The Edit, Text, and System keypads and the app panel: two columns of
    /// buttons that show only their keys.
    public enum AppPanel {
        public static let width: CGFloat = 150
        public static let gap: CGFloat = 6
        public static let buttonHeight: CGFloat = 44
        /// One column: half the width, less half the gap.
        public static let buttonWidth: CGFloat = (width - gap) / 2
        public static let cornerRadius: CGFloat = 8
        /// The rows of the app panel grid.
        public static let rows = 6
        public static let headerSpacing: CGFloat = 6
        public static let headerBottom: CGFloat = 8
        public static let appDot: CGFloat = 5
        /// Long keys, such as a sequence, shrink to fit the button.
        public static let keysMinimumScale: CGFloat = 0.7
        /// The dash of the border of an empty slot.
        public static let emptySlotDash: CGFloat = 3
        /// The padding of the text in a text button.
        public static let textPadding: CGFloat = 8

        /// The dot that marks a learned chord, in the top right corner.
        public static let learnedDot: CGFloat = 6
        public static let learnedDotTop: CGFloat = 3
        public static let learnedDotTrailing: CGFloat = 4

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
