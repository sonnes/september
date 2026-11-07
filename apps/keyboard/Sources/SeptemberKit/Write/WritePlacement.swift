import CoreGraphics

/// Frames for the place of the Write paper. Frames use the coordinates of
/// AppKit, with the origin at the bottom left.
public enum WritePlacement {
    /// Converts a rect in the content of a borderless window to the screen.
    /// The rect has its origin at the top left of the window, as in SwiftUI.
    public static func screenRect(_ rect: CGRect, in window: CGRect) -> CGRect {
        CGRect(
            x: window.minX + rect.minX, y: window.maxY - rect.maxY,
            width: rect.width, height: rect.height)
    }
}
