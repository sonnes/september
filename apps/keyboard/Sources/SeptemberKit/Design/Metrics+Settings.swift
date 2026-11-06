import CoreGraphics

extension Metrics {
    /// The Settings window. It uses the standard macOS controls, so only the
    /// window and the sidebar icons have sizes of their own.
    public enum Settings {
        public static let windowSize = CGSize(width: 700, height: 560)
        public static let sidebarWidth: CGFloat = 200
        public static let iconSize: CGFloat = 20
        public static let iconCornerRadius: CGFloat = 5
    }
}
