import Foundation

/// The colours of the native Write editor. Each one is a token of the
/// keyboard, so the paper matches the keys.
extension Tokens {
    public static let writePaper = key
    public static let writeText = keyText
    public static let writeMuted = labelSecondary
    /// Quoted text, a little lighter than body text.
    public static let writeQuote = keyText.opacity(0.78)
    public static let writeAccent = accent
    public static let writeSelection = selection
    /// The fill of code.
    public static let writeCode = keySpecial
    /// Quote bars and rules.
    public static let writeStroke = strokeStandard
    /// The border of an open checkbox.
    public static let writeTaskBorder = accent.opacity(0.4)
    /// The shadow of the paper cards on the desk.
    public static let writeCardShadow = ThemeColor(
        light: RGBA(hex8: 0x0000002E), dark: RGBA(hex8: 0x0000008C))
    /// The text of a button on the accent colour.
    public static let writeOnAccent = ThemeColor(light: RGBA(hex: 0xFFFFFF), dark: RGBA(hex: 0xFFFFFF))
    /// Move to Trash.
    public static let writeDanger = warning
    /// The Undo notice is dark on light, and light on dark.
    public static let writeNoticeFill = keyText
    public static let writeNoticeText = background
}
