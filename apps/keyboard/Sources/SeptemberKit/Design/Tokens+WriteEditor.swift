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
}
