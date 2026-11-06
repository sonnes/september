import CoreGraphics

extension Metrics {
    /// The Speak button at the right of the input bar, and the highlight of
    /// the current word.
    public enum Speak {
        public static let button = CGSize(width: 132, height: 48)
        public static let contentSpacing: CGFloat = 8
        public static let speakerIcon: CGFloat = 18
        public static let stopIcon: CGFloat = 14
        /// The accent ring of Stop.
        public static let stopBorder: CGFloat = 2
        public static let wordCornerRadius: CGFloat = 4
        public static let wordHorizontalPadding: CGFloat = 2
        public static let wordVerticalPadding: CGFloat = 1
    }

    /// The Voice and Speech pages of the Settings window.
    public enum SpeechSettings {
        public static let rowSpacing: CGFloat = 12
        public static let detailSpacing: CGFloat = 2
        public static let radio: CGFloat = 16
        public static let valueWidth: CGFloat = 44
    }
}
