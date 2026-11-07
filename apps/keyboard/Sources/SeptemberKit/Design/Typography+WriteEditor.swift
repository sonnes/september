import AppKit

extension Typography {
    /// A font of the native Write editor. Body text uses the system font, as
    /// the "Sans Serif" setting of the web editor does.
    public static func writeEditor(
        size: CGFloat, weight: NSFont.Weight = .regular, italic: Bool = false, monospaced: Bool = false
    ) -> NSFont {
        var font =
            monospaced
            ? NSFont.monospacedSystemFont(ofSize: size, weight: weight)
            : NSFont.systemFont(ofSize: size, weight: weight)
        if italic {
            let descriptor = font.fontDescriptor.withSymbolicTraits(font.fontDescriptor.symbolicTraits.union(.italic))
            font = NSFont(descriptor: descriptor, size: size) ?? font
        }
        return font
    }
}
