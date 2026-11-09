/// The panels of Write: `Resources/Panels/write.json` on the paper, and
/// `write-documents.json` on the desk.
///
/// Write belongs to the keyboard itself, so it has no bundle ID of its own.
/// These names take its place when Write comes to the front.
public enum WritePanel {
    public static let id = "september.write"
    public static let documentsID = "september.write.documents"

    /// True for the panel of the paper and the panel of the desk.
    public static func isWrite(_ bundleID: String?) -> Bool {
        bundleID == id || bundleID == documentsID
    }
}
