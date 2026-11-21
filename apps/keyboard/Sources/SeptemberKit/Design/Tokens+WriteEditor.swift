import Foundation

/// The colours of Write that the keyboard does not have.
extension Tokens {
    /// The background of code on the Write paper. In light, it is a faint
    /// tint of the text. In dark, it is the surface of a special key.
    public static let writeCodeTint = ThemeColor(
        light: keyText.light.opacity(0.045), dark: keySpecial.dark)
    /// The shadow of the paper cards on the desk.
    public static let writeCardShadow = ThemeColor(
        light: RGBA(hex8: 0x0000002E), dark: RGBA(hex8: 0x0000008C))
}
