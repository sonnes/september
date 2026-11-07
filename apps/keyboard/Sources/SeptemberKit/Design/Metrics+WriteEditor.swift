import CoreGraphics
import Foundation
import QuartzCore

extension Metrics {
    /// The sizes of the Write editor. They come from the Piper editor. An
    /// `em` value is a multiple of the text size of its block.
    public enum WriteEditor {
        /// The line height of body text, in `em`.
        public static let lineHeight: CGFloat = 1.6
        /// The space after a block, in `em`.
        public static let blockGap: CGFloat = 0.75
        /// The space after a list item that another item follows, in `em`.
        public static let listGap: CGFloat = 0.25
        /// The text size of each heading level, in `em` of body text.
        public static let headingScale: [CGFloat] = [1.8, 1.27, 1.1, 1, 1, 1]
        /// The line height of each heading level, in `em` of the heading.
        public static let headingLineHeight: [CGFloat] = [1.2, 1.25, 1.3, 1.35, 1.4, 1.4]
        /// The space before a heading, in `em` of the heading.
        public static let headingSpaceBefore: CGFloat = 1.3
        /// The text size of code, in `em`.
        public static let codeScale: CGFloat = 0.9
        /// The space inside a code block, at the top and the bottom.
        public static let codePaddingVertical: CGFloat = 24
        /// The space inside a code block, at the left and the right.
        public static let codePaddingHorizontal: CGFloat = 13.6
        public static let codeCornerRadius: CGFloat = 6
        /// The space inside an inline code run, at the left and the right.
        public static let inlineCodePadding: CGFloat = 0.3
        public static let inlineCodeCornerRadius: CGFloat = 3
        /// The indent of each list level.
        public static let listIndent: CGFloat = 20.8
        /// The space between a quote bar and the text of the quote.
        public static let quoteIndent: CGFloat = 16
        public static let quoteBarWidth: CGFloat = 2
        /// The checkbox of a to-do item, in `em`.
        public static let taskBox: CGFloat = 1.1
        public static let taskBoxRadius: CGFloat = 0.32
        public static let taskBoxBorder: CGFloat = 1.5
        /// The space between a checkbox and its text.
        public static let taskGap: CGFloat = 8.8
        /// The check mark, in `em` of the box.
        public static let taskMark: CGFloat = 0.82
        public static let ruleThickness: CGFloat = 1
        /// The widest text column.
        public static let textWidth: CGFloat = 640
        /// The space at the left and the right of the text.
        public static let sideMargin: CGFloat = 48
        /// The space above and below the text on the paper.
        public static let paperMargin: CGFloat = 48
        /// The corners of the paper, the same as the cards of the keyboard.
        public static let paperCornerRadius: CGFloat = Detached.cornerRadius
        /// The space between a save error and the corner of the paper.
        public static let noticePadding: CGFloat = 10
        /// The caret is this many times as tall as the glyphs of its line,
        /// and never taller than the line.
        public static let caretHeightScale: CGFloat = 1.5
        public static let caretCornerRadius: CGFloat = 2
        /// The caret width is `caretWidthScale` × its height + `caretWidthBase`.
        public static let caretWidthScale: CGFloat = 0.02
        public static let caretWidthBase: CGFloat = 2
    }

    /// The sizes of the desk of Write, where the documents stand as cards.
    public enum WriteDesk {
        /// A card has the shape of A4 paper, as the paper does.
        public static let cardSize = CGSize(width: 200, height: 283)
        public static let cardGap: CGFloat = 24
        public static let cardCornerRadius: CGFloat = 12
        /// The space inside a card.
        public static let cardPadding: CGFloat = 16
        /// The lines of the document on its card.
        public static let cardLines = 6
        /// The selected card rises by this height.
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
        /// A card rises from this scale and from this depth below its place.
        public static let riseScale: CGFloat = 0.6
        public static let riseDepth: CGFloat = 260
    }

    /// The motion of the native Write editor and its paper. The values come
    /// from the Piper editor. With Reduce Motion on, nothing moves, and the
    /// caret still blinks.
    public enum WriteMotion {
        /// The caret glides to its next place after a key press.
        public static let caretGlide: TimeInterval = 0.105
        /// The caret stays solid for this time after a change, then blinks.
        public static let caretIdle: TimeInterval = 0.5
        /// One blink: solid to 40%, out at 80%, solid at 100%.
        public static let caretBlink: TimeInterval = 1
        public static let caretBlinkKeyTimes: [Double] = [0, 0.4, 0.8, 1]
        public static let caretBlinkValues: [Double] = [1, 1, 0, 1]
        /// The fill and the border of a checkbox change colour.
        public static let taskColor: TimeInterval = 0.16
        /// A checkbox pops from `taskPopScale` to full size when checked.
        public static let taskPop: TimeInterval = 0.18
        public static let taskPopScale: Double = 0.85
        /// The check mark scales in, and fades in.
        public static let taskMarkScale: TimeInterval = 0.14
        public static let taskMarkFade: TimeInterval = 0.1
        /// The paper grows out of the input bar when it opens.
        public static let paperOpen: TimeInterval = 0.3
        /// The paper grows or shrinks by a line, or the text moves up by a
        /// line on a full page.
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
        /// The caret curve, `linear(0, 0.44 25%, 0.75 50%, 0.94 75%, 1)`: the
        /// part of the way that the caret has moved at each key time.
        public static let caretKeyTimes: [Double] = [0, 0.25, 0.5, 0.75, 1]
        public static let caretProgress: [Double] = [0, 0.44, 0.75, 0.94, 1]

        public static var snappyTiming: CAMediaTimingFunction {
            CAMediaTimingFunction(controlPoints: snappy[0], snappy[1], snappy[2], snappy[3])
        }
    }
}
