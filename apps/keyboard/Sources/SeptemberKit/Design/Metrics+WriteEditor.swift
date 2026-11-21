import CoreGraphics
import Foundation
import QuartzCore

extension Metrics {
    /// The sizes of the Write paper.
    public enum WriteEditor {
        /// The text size of body text on the editor page. An `em` value is a
        /// multiple of the text size of its block.
        public static let textSize: CGFloat = 18
        /// The line height of body text, in `em`.
        public static let lineHeight: CGFloat = 1.65
        /// The space after a paragraph, a list, a quote, or code, in `em`.
        public static let blockGap: CGFloat = 0.85
        /// The space after a list item, in `em`.
        public static let listGap: CGFloat = 0.25
        /// The text size of the heading levels 1, 2, 3, and 4 to 6, in `em`.
        public static let headingScale: [CGFloat] = [1.9, 1.35, 1.12, 1]
        /// The space before a heading and around a rule, in `em` of the block.
        public static let headingSpaceBefore: CGFloat = 1.6
        /// The text size of code, in `em`.
        public static let codeScale: CGFloat = 0.86
        public static let codeCornerRadius: CGFloat = 8
        /// The space between a quote bar and the text of the quote.
        public static let quoteIndent: CGFloat = 16
        public static let quoteBarWidth: CGFloat = 2
        public static let ruleThickness: CGFloat = 1
        /// The widest text column, about 70 characters of body text.
        public static let textWidth: CGFloat = 600
        /// The space at the left and the right of the text.
        public static let sideMargin: CGFloat = 56
        /// The space above and below the text on the paper.
        public static let paperMargin: CGFloat = 48
        public static let paperCornerRadius: CGFloat = Detached.cornerRadius
        /// The space between a save error and the corner of the paper.
        public static let noticePadding: CGFloat = 10
        /// The space between the tools rail and the paper.
        public static let railGap: CGFloat = 14
        /// The space between the buttons of the tools rail.
        public static let railSpacing: CGFloat = TopRow.modeSpacing
    }

    /// The sizes of the desk of Write, where the documents stand as cards.
    public enum Desk {
        /// A card has the shape of A4 paper, as the paper does.
        public static let cardSize = CGSize(width: 200, height: 283)
        public static let cardGap: CGFloat = 24
        public static let cardCornerRadius: CGFloat = 12
        public static let cardPadding: CGFloat = 16
        public static let selectedLift: CGFloat = 14
        public static let selectionRing: CGFloat = 3
        /// The dashes of the border of the New Document card.
        public static let newCardDash: [CGFloat] = [6, 5]
        public static let newCardBorder: CGFloat = 2
        /// The space between the cards and the bottom of the desk.
        public static let bottomPadding: CGFloat = 32
        /// The space between the rows of the desk.
        public static let spacing: CGFloat = 16
        public static let actionHeight: CGFloat = 40
        public static let actionGap: CGFloat = 6
        public static let actionPadding: CGFloat = 14
        public static let findSize = CGSize(width: 460, height: 44)
        public static let findPadding: CGFloat = 18
        public static let noticeSize = CGSize(width: 420, height: 40)
        /// The space between the blur behind the desk and the parts on it.
        public static let backdropPadding: CGFloat = 24
        public static let backdropCornerRadius: CGFloat = Detached.cornerRadius
        /// A card rises from this scale and from this depth below its place.
        public static let riseScale: CGFloat = 0.6
        public static let riseDepth: CGFloat = 260
    }

    /// The motion of the Write paper and the desk. With Reduce Motion on,
    /// nothing moves.
    public enum WriteMotion {
        /// The paper grows out of the input bar when it opens.
        public static let paperOpen: TimeInterval = 0.3
        /// The paper grows or shrinks by a line.
        public static let paperFeed: TimeInterval = 0.12
        /// The cards rise out of the bar, or go back down into it.
        public static let deskCards: TimeInterval = 0.3
        /// Each card starts this time after the card to its left.
        public static let cardStagger: TimeInterval = 0.03
        /// The selected card rises, or a card moves to its new place.
        public static let cardMove: TimeInterval = 0.2
        /// Undo of Move to Trash stays this long.
        public static let undoTime: TimeInterval = 8

        /// `cubic-bezier(0.2, 0, 0, 1)`, the snappy curve of the Piper editor.
        public static let snappy: [Float] = [0.2, 0, 0, 1]
        /// A snapshot of the paper waits this long after the page reports
        /// its height, so that the page draws its fonts.
        public static let snapshotSettle: TimeInterval = 0.5

        public static var snappyTiming: CAMediaTimingFunction {
            CAMediaTimingFunction(controlPoints: snappy[0], snappy[1], snappy[2], snappy[3])
        }
    }
}
