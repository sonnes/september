import Foundation

/// The counts of My Panel. They live in a usage store of their own, so My
/// Panel never shows up as an app on the App Panels page.
extension UsageStore: ButtonUsage {
    /// The name that the counts of My Panel go under.
    static let userPanelID = "my-panel"

    /// The file of the counts of My Panel, beside the counts of the app panels.
    public static var userPanelURL: URL {
        defaultURL.deletingLastPathComponent().appendingPathComponent("my-panel-usage.json")
    }

    /// Counts one press of a button of My Panel.
    public func recordUserButton(_ buttonID: String) {
        record(buttonID: buttonID, bundleID: Self.userPanelID)
    }

    /// The presses of a button of My Panel, less their decay, rounded.
    public func uses(of buttonID: String) -> Int {
        Int(weight(buttonID: buttonID, bundleID: Self.userPanelID).rounded())
    }
}
