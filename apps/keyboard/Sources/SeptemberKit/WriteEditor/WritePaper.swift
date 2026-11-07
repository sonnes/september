import CoreGraphics

/// The place of the Write paper, and the scroll of its text.
///
/// The page is the largest sheet with the shape of A4 paper in the space
/// above the keyboard window, centred on the input bar. The paper fills the
/// page from the bottom up, as tall as its text, as paper comes out of a
/// typewriter. At the top of the page, the paper stops, and the text moves up
/// so that the typing line stays at the bottom. Frames use the coordinates of
/// AppKit, with the origin at the bottom left.
public enum WritePaper {
    /// The height of A4 paper divided by its width.
    static let pageRatio: CGFloat = 297 / 210

    /// The frame of the full page.
    ///
    /// - Parameters:
    ///   - bar: the frame of the input bar on the screen.
    ///   - floor: the top of the keyboard window.
    ///   - screen: the visible frame of the screen.
    ///   - margin: the space between the page and the edges of the screen.
    ///     The same space is kept above `floor`.
    public static func page(bar: CGRect, floor: CGFloat, screen: CGRect, margin: CGFloat) -> CGRect {
        let bottom = floor + margin
        var height = screen.maxY - margin - bottom
        var width = height / pageRatio
        if width > screen.width - 2 * margin {
            width = screen.width - 2 * margin
            height = width * pageRatio
        }
        let x = min(max(bar.midX - width / 2, screen.minX + margin), screen.maxX - margin - width)
        return CGRect(x: x, y: max(bottom, screen.minY), width: width, height: height)
    }

    /// The frame of the paper for a text of `height` points. The paper grows
    /// up from the bottom of the page and stops at the top of the page.
    public static func paper(height: CGFloat, on page: CGRect) -> CGRect {
        CGRect(x: page.minX, y: page.minY, width: page.width, height: min(height, page.height))
    }

    /// The scroll origin that keeps the caret in view on a full page, in the
    /// flipped coordinates of the text, with y down.
    ///
    /// A caret below the view moves the text up so that the caret line sits
    /// `margin` above the bottom of the view, as a typewriter feeds paper. A
    /// caret above the view brings its line to `margin` below the top. A
    /// caret in view does not move the text.
    public static func scrollOrigin(
        caretMaxY: CGFloat, current: CGFloat, visibleHeight: CGFloat, contentHeight: CGFloat,
        margin: CGFloat, caretHeight: CGFloat = 0
    ) -> CGFloat {
        let highest = max(0, contentHeight - visibleHeight)
        var origin = current
        if caretMaxY > current + visibleHeight - margin {
            origin = caretMaxY - (visibleHeight - margin)
        } else if caretMaxY - caretHeight < current + margin {
            origin = caretMaxY - caretHeight - margin
        }
        return min(max(origin, 0), highest)
    }
}
