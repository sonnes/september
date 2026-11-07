import Foundation

extension Metrics {
    /// The text size of the Markdown editor, in CSS pixels.
    public static let writeEditorTextSize: Double = 18
    public static let writeWindowMinSize = CGSize(width: 560, height: 360)
    public static let writeSidebarWidth: CGFloat = 220
    public static let writeSidebarMinWidth: CGFloat = 160
    public static let writeSidebarMaxWidth: CGFloat = 320
    public static let writeRowSpacing: CGFloat = 2
    public static let writeNoticePadding: CGFloat = 10
    /// The time that the Write window takes to grow out of the input bar.
    public static let writeOpenAnimation: TimeInterval = 0.3
}
