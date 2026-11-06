import CoreGraphics
import Foundation

extension Metrics {
    /// The prediction stack above the input bar and the word row above the
    /// keys, from frames 1 and 8 of the keyboard predictions mock.
    public enum Predictions {
        /// The gap between the rows of the stack.
        public static let rowSpacing: CGFloat = 8
        /// The gap between the tiles of a row.
        public static let tileSpacing: CGFloat = 6
        public static let tileHeight: CGFloat = 44
        public static let tileHorizontalPadding: CGFloat = 14
        public static let tileCornerRadius: CGFloat = 8
        public static let strokeWidth: CGFloat = 1
        /// The mark in place of the words that the field already holds.
        public static let leadInPadding: CGFloat = 2
        public static let leadInOpacity: Double = 0.7
        /// Old predictions while new ones are on the way.
        public static let staleOpacity: Double = 0.55
        /// Three rows. The stack keeps this height, so the input bar does not
        /// move when the predictions change.
        public static let stackHeight: CGFloat = tileHeight * 3 + rowSpacing * 2
        /// The gap between the stack and the input bar.
        public static let stackBottomSpacing: CGFloat = 14

        public static let noticeHeight: CGFloat = 58
        public static let noticeHorizontalPadding: CGFloat = 18
        public static let noticeCornerRadius: CGFloat = 14
        public static let noticeSpacing: CGFloat = 12

        public static let wordSlots = 5
        public static let wordHeight: CGFloat = 40
        public static let wordSpacing: CGFloat = 6
        public static let wordCornerRadius: CGFloat = 8
        /// The space between the words and the line under them.
        public static let wordRowLinePadding: CGFloat = 4
        /// The space between the line and the first row of keys.
        public static let wordRowBottomSpacing: CGFloat = 2
        /// An accent of a held letter is a square tile as high as a word.
        public static let accentTile: CGFloat = wordHeight
        /// The dashes of an empty word slot.
        public static let emptySlotDash: [CGFloat] = [4, 3]
    }
}
