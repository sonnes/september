import AppKit

extension Typography {
    /// The save error at the top of the paper.
    public static var writeNotice: NSFont { .systemFont(ofSize: 11) }

    public static var writeCardTitle: NSFont { .systemFont(ofSize: 15, weight: .semibold) }
    /// The lines of a document and its date on its card.
    public static var writeCardLine: NSFont { .systemFont(ofSize: 11) }
    /// The New Document card.
    public static var writeCardNew: NSFont { .systemFont(ofSize: 15, weight: .medium) }
    public static var writeFind: NSFont { .systemFont(ofSize: 16) }
    /// The number of documents beside the Find field.
    public static var writeFindCount: NSFont { .systemFont(ofSize: 13) }
    /// The actions of the selected card, and the Undo notice.
    public static var writeDeskAction: NSFont { .systemFont(ofSize: 13.5, weight: .medium) }
}
