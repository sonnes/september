import Foundation

/// The panels shipped with the app: the fixed keypads, one panel per app we
/// know shortcuts for, and a generic panel for every other app.
///
/// File names are the identity: `edit.json`, `navigate.json`, `system.json`,
/// `Apps/generic.json`, and `Apps/<bundle id>.json`.
public struct PanelStore: Sendable {
    public let edit: PanelDefinition
    public let navigate: PanelDefinition
    public let system: PanelDefinition
    private let generic: PanelDefinition
    private let byBundleID: [String: PanelDefinition]

    public init(
        edit: PanelDefinition,
        navigate: PanelDefinition,
        system: PanelDefinition,
        generic: PanelDefinition,
        byBundleID: [String: PanelDefinition]
    ) {
        self.edit = edit
        self.navigate = navigate
        self.system = system
        self.generic = generic
        self.byBundleID = byBundleID
    }

    public func appPanel(forBundleID bundleID: String?) -> PanelDefinition {
        guard let bundleID, let panel = byBundleID[bundleID] else { return generic }
        return panel
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
            navigate: try load("navigate"),
            system: try load("system"),
            generic: try load("generic", in: apps),
            byBundleID: byBundleID
        )
    }
}
