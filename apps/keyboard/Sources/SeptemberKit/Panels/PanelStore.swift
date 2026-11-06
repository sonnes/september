import Foundation

/// The panels shipped with the app: the fixed keypads, one panel per app we
/// know shortcuts for, and a generic panel for every other app.
///
/// File names are the identity: `edit.json`, `text.json`, `system.json`,
/// `Apps/generic.json`, and `Apps/<bundle id>.json`. The Claude Code panel is
/// `Apps/claude-code.json`, because it belongs to a tool in a terminal, not to
/// an app.
public struct PanelStore: Sendable {
    public let edit: PanelDefinition
    public let text: PanelDefinition
    public let system: PanelDefinition
    /// The panel of an app with no panel file.
    public let generic: PanelDefinition
    private let byBundleID: [String: PanelDefinition]

    public init(
        edit: PanelDefinition,
        text: PanelDefinition,
        system: PanelDefinition,
        generic: PanelDefinition,
        byBundleID: [String: PanelDefinition]
    ) {
        self.edit = edit
        self.text = text
        self.system = system
        self.generic = generic
        self.byBundleID = byBundleID
    }

    public func appPanel(forBundleID bundleID: String?) -> PanelDefinition {
        guard let bundleID, let panel = byBundleID[bundleID] else { return generic }
        return panel
    }

    /// True when the app has a panel file of its own.
    public func hasPanel(forBundleID bundleID: String) -> Bool {
        byBundleID[bundleID] != nil
    }

    /// Each app panel with its bundle ID, by title.
    public var appPanels: [(bundleID: String, panel: PanelDefinition)] {
        byBundleID
            .map { (bundleID: $0.key, panel: $0.value) }
            .sorted { $0.panel.title.localizedStandardCompare($1.panel.title) == .orderedAscending }
    }

    /// The chords of the Edit, Text, and System keypads.
    public var keypadShortcuts: Set<Shortcut> {
        edit.shortcuts.union(text.shortcuts).union(system.shortcuts)
    }

    /// Loads the panels from `Resources/Panels`. Throws when a fixed panel is
    /// missing or any file does not decode.
    public static func bundled() throws -> PanelStore {
        guard let root = Bundle.module.url(forResource: "Panels", withExtension: nil) else {
            throw PanelDecodingError.missingPanel("Panels")
        }
        let decoder = JSONDecoder()

        func load(_ name: String, in directory: URL = root) throws -> PanelDefinition {
            let url = directory.appendingPathComponent(name).appendingPathExtension("json")
            guard FileManager.default.fileExists(atPath: url.path) else {
                throw PanelDecodingError.missingPanel(name)
            }
            return try decoder.decode(PanelDefinition.self, from: Data(contentsOf: url))
        }

        let apps = root.appendingPathComponent("Apps")
        var byBundleID: [String: PanelDefinition] = [:]
        for file in try FileManager.default.contentsOfDirectory(
            at: apps, includingPropertiesForKeys: nil)
        where file.pathExtension == "json" {
            let name = file.deletingPathExtension().lastPathComponent
            guard name != "generic" else { continue }
            byBundleID[name] = try load(name, in: apps)
        }

        return PanelStore(
            edit: try load("edit"),
            text: try load("text"),
            system: try load("system"),
            generic: try load("generic", in: apps),
            byBundleID: byBundleID
        )
    }
}
