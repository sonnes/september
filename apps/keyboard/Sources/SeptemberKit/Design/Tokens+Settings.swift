extension Tokens {
    /// The fill of each sidebar icon in the Settings window. The mock uses the
    /// same fill in light and dark.
    public static func settingsIcon(_ page: SettingsPage) -> ThemeColor {
        let hex: UInt32
        switch page {
        case .voice, .accessibility: hex = 0x0A84FF
        case .speech: hex = 0x8B5CF6
        case .predictions: hex = 0xFF9F0A
        case .appPanels: hex = 0x30B85C
        case .myPanel: hex = 0x5E5CE6
        case .look: hex = 0xFF375F
        }
        return ThemeColor(light: RGBA(hex: hex), dark: RGBA(hex: hex))
    }

    /// The glyph on a sidebar icon.
    public static let settingsIconGlyph = ThemeColor(
        light: RGBA(hex: 0xFFFFFF), dark: RGBA(hex: 0xFFFFFF))
}
