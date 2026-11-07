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

    /// The title of a card on the desk.
    public static var writeCardTitle: NSFont { .systemFont(ofSize: 15, weight: .semibold) }
    /// The lines of a document and its date on its card.
    public static var writeCardLine: NSFont { .systemFont(ofSize: 11) }
    /// The New Document card.
    public static var writeCardNew: NSFont { .systemFont(ofSize: 15, weight: .medium) }
    /// The Find field of the desk.
    public static var writeFind: NSFont { .systemFont(ofSize: 16) }
    /// The number of documents beside the Find field.
    public static var writeFindCount: NSFont { .systemFont(ofSize: 13) }
    /// The actions of the selected card, and the Undo notice.
    public static var writeDeskAction: NSFont { .systemFont(ofSize: 13.5, weight: .medium) }
}
