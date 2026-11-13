import Foundation

/// The colours of the native Write editor that the keyboard does not have.
extension Tokens {
    /// Quoted text, a little lighter than body text.
    public static let writeQuote = keyText.opacity(0.78)
    /// The border of an open checkbox.
    public static let writeTaskBorder = accent.opacity(0.4)
    /// The shadow of the paper cards on the desk.
    public static let writeCardShadow = ThemeColor(
        light: RGBA(hex8: 0x0000002E), dark: RGBA(hex8: 0x0000008C))
}
