extension Tokens {
    /// The fills of the icons in the sidebar of the Settings window. The mock
    /// uses the same fill in light and dark.
    public enum Settings {
        public static let blueIcon = solid(Tokens.accent.dark)
        public static let purpleIcon = solid(RGBA(hex: 0x8B5CF6))
        public static let orangeIcon = solid(RGBA(hex: 0xFF9F0A))
        public static let tealIcon = solid(Tokens.rowShift.dark)
        public static let indigoIcon = solid(RGBA(hex: 0x5E5CE6))
        public static let pinkIcon = solid(RGBA(hex: 0xFF375F))

        private static func solid(_ fill: RGBA) -> ThemeColor {
            ThemeColor(light: fill, dark: fill)
        }
    }
}
