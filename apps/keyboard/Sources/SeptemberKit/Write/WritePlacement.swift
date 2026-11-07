import CoreGraphics

/// The place of the Write window. The window opens above the keyboard window,
/// centred on the input bar. By default, the editor is a portrait page with
/// the shape of A4 paper, beside the sidebar. Frames use the coordinates of
/// AppKit, with the origin at the bottom left.
public enum WritePlacement {
    /// The height of A4 paper divided by its width.
    static let pageRatio: CGFloat = 297 / 210

    /// The frame of the Write window when it opens.
    ///
    /// - Parameters:
    ///   - size: the size that the user gave the window. If it is nil, the
    ///     editor is an A4 page as tall as the space above `floor`.
    ///   - bar: the frame of the input bar on the screen.
    ///   - floor: the top of the keyboard window.
    ///   - screen: the visible frame of the screen.
    ///   - margin: the space between the window and the edges of the screen.
    ///     The same space is kept above `floor`.
    public static func frame(
        size: CGSize?, bar: CGRect, floor: CGFloat, screen: CGRect, margin: CGFloat
    ) -> CGRect {
        let bottom = floor + margin
        let room = CGSize(width: screen.width - 2 * margin, height: screen.maxY - margin - bottom)
        let size = size ?? pageSize(room: room)
        let x = min(max(bar.midX - size.width / 2, screen.minX + margin), screen.maxX - margin - size.width)
        let y = max(min(bottom, screen.maxY - margin - size.height), screen.minY)
        return CGRect(origin: CGPoint(x: x, y: y), size: size)
    }

    /// The size of a window that holds the sidebar and the largest A4 page
    /// that fits in `room`. The size is never less than the minimum size of
    /// the window.
    static func pageSize(room: CGSize) -> CGSize {
        let sidebar = Metrics.writeSidebarWidth
        var height = room.height
        if sidebar + height / pageRatio > room.width {
            height = (room.width - sidebar) * pageRatio
        }
        let minimum = Metrics.writeWindowMinSize
        return CGSize(
            width: max(sidebar + height / pageRatio, minimum.width),
            height: max(height, minimum.height))
    }

    /// Converts a rect in the content of a borderless window to the screen.
    /// The rect has its origin at the top left of the window, as in SwiftUI.
    public static func screenRect(_ rect: CGRect, in window: CGRect) -> CGRect {
        CGRect(
            x: window.minX + rect.minX, y: window.maxY - rect.maxY,
            width: rect.width, height: rect.height)
    }
}
