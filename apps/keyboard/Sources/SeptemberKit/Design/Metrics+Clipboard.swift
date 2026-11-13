import CoreGraphics
import Foundation

extension Metrics {
    /// Cut, Copy, Paste, and History at the left of the input bar, and the
    /// clipboard history in the place of the prediction stack, from the
    /// clipboard history mock.
    public enum Clipboard {
        public static let buttonCount = 4
        /// The four buttons, as wide as the same number of mode buttons.
        public static let buttonsWidth: CGFloat =
            TopRow.modeCircle * CGFloat(buttonCount) + TopRow.modeSpacing * CGFloat(buttonCount - 1)

        /// Two copied texts in each row. A page of `ClipboardHistory` fills
        /// the rows.
        public static let columns = 2
        public static let spacing: CGFloat = Predictions.rowSpacing
        public static let clipHeight: CGFloat = Predictions.tileHeight
        public static let clipHorizontalPadding: CGFloat = 12
        public static let clipCornerRadius: CGFloat = Predictions.tileCornerRadius
        /// The gap between a copied text and its age.
        public static let clipAgeSpacing: CGFloat = 10
        /// The column of Newer, the page number, and Older.
        public static let pagerWidth: CGFloat = 92
        public static let pagerSpacing: CGFloat = 6
        public static let disabledOpacity: Double = 0.4
    }
}
