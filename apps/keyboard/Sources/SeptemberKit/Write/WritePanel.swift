/// The app panels of Write: `Resources/Panels/Apps/september.write.json`
/// on the paper, and `september.write.documents.json` on the desk.
///
/// Write belongs to the keyboard itself, so the app in front has no bundle
/// ID of its own for the panel. These names take its place.
public enum WritePanel {
    public static let id = "september.write"
    public static let documentsID = "september.write.documents"

    /// True for the panel of the paper and the panel of the desk.
    public static func isWrite(_ bundleID: String?) -> Bool {
        bundleID == id || bundleID == documentsID
    }
}
