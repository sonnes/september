import AppKit

extension Typography {
    /// A font of the Write editor. Body text uses the system font.
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

    /// The save error at the top of the paper.
    public static var writeNotice: NSFont { .systemFont(ofSize: 11) }
}
