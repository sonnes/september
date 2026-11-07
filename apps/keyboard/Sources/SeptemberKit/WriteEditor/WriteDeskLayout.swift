import CoreGraphics

/// The place of each part of the desk of Write, in the space above the
/// keyboard.
///
/// The cards stand in one row near the bottom of the space, centred on the
/// input bar. The actions of the selected card are above the cards, the Find
/// field is above the actions, and the Undo notice is above the Find field.
/// When the row is wider than the space, the row shows the cards around the
/// selected card. Frames use the coordinates of AppKit, with the origin at
/// the bottom left.
public struct WriteDeskLayout: Equatable, Sendable {
    public static var cardSize: CGSize { Metrics.WriteDesk.cardSize }
    public static var cardGap: CGFloat { Metrics.WriteDesk.cardGap }
    public static var bottomPadding: CGFloat { Metrics.WriteDesk.bottomPadding }

    /// The indexes of the cards in view.
    public let visible: Range<Int>
    /// The frame of each card in view, in the order of `visible`.
    public let cards: [CGRect]
    /// The row of the actions. The buttons centre on `centre`.
    public let actions: CGRect
    public let find: CGRect
    public let notice: CGRect
    /// The middle of the row of cards.
    public let centre: CGFloat

    /// - Parameters:
    ///   - area: the space above the keyboard.
    ///   - centre: the middle of the input bar.
    ///   - count: the number of cards.
    ///   - selection: the index of the selected card.
    public init(area: CGRect, centre bar: CGFloat, count: Int, selection: Int) {
        let size = Self.cardSize
        let gap = Self.cardGap
        let fits = max(1, Int((area.width + gap) / (size.width + gap)))
        let shown = min(count, fits)
        let first = min(max(selection - shown / 2, 0), max(count - shown, 0))
        visible = first..<(first + shown)

        let width = CGFloat(shown) * size.width + CGFloat(max(shown - 1, 0)) * gap
        let left = min(max(bar - width / 2, area.minX), area.maxX - width)
        let bottom = area.minY + Self.bottomPadding
        cards = (0..<shown).map { index in
            CGRect(
                x: left + CGFloat(index) * (size.width + gap), y: bottom, width: size.width,
                height: size.height)
        }
        centre = left + width / 2

        let space = Metrics.WriteDesk.spacing
        actions = CGRect(
            x: area.minX, y: bottom + size.height + Metrics.WriteDesk.selectedLift + space,
            width: area.width, height: Metrics.WriteDesk.actionHeight)
        find = Self.centred(Metrics.WriteDesk.findSize, on: centre, y: actions.maxY + space, in: area)
        notice = Self.centred(Metrics.WriteDesk.noticeSize, on: centre, y: find.maxY + space, in: area)
    }

    private static func centred(_ size: CGSize, on centre: CGFloat, y: CGFloat, in area: CGRect) -> CGRect {
        let x = min(max(centre - size.width / 2, area.minX), area.maxX - size.width)
        return CGRect(x: x, y: y, width: size.width, height: size.height)
    }
}
