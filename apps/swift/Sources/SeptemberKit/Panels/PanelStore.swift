import Foundation

/// The panels shipped with the app: the fixed keypads plus one panel per app
/// we know shortcuts for, with a generic fallback.
public struct PanelStore: Sendable {
    private let panels: [String: PanelDefinition]
    private let byBundleID: [String: PanelDefinition]
    private let generic: PanelDefinition

    public init(
        panels: [PanelDefinition],
        appPanels: [String: PanelDefinition],
        generic: PanelDefinition
    ) {
        self.panels = Dictionary(uniqueKeysWithValues: panels.map { ($0.id, $0) })
        self.byBundleID = appPanels
        self.generic = generic
    }

    public func panel(id: String) -> PanelDefinition? { panels[id] }

    public func appPanel(forBundleID bundleID: String?) -> PanelDefinition {
        guard let bundleID, let panel = byBundleID[bundleID] else { return generic }
        return panel
    }

    public var allPanels: [PanelDefinition] {
        Array(panels.values) + Array(byBundleID.values) + [generic]
    }

    /// Loads `Resources/Panels/*.json` and `Resources/Panels/Apps/<bundle id>.json`.
    public static func bundled(bundle: Bundle? = nil) throws -> PanelStore {
        let bundle = bundle ?? .module
        guard let root = bundle.url(forResource: "Panels", withExtension: nil) else {
            throw PanelDecodingError.missingPanels
        }
        let decoder = JSONDecoder()

        func load(_ url: URL) throws -> PanelDefinition {
            try decoder.decode(PanelDefinition.self, from: Data(contentsOf: url))
        }

        let files = try FileManager.default.contentsOfDirectory(
            at: root,
            includingPropertiesForKeys: nil
        )
        let panels = try files.filter { $0.pathExtension == "json" }.map(load)

        var appPanels: [String: PanelDefinition] = [:]
        var generic: PanelDefinition?
        let appsDirectory = root.appendingPathComponent("Apps")
        if let appFiles = try? FileManager.default.contentsOfDirectory(
            at: appsDirectory,
            includingPropertiesForKeys: nil
        ) {
            for file in appFiles where file.pathExtension == "json" {
                let panel = try load(file)
                let name = file.deletingPathExtension().lastPathComponent
                if name == "generic" {
                    generic = panel
                } else {
                    appPanels[name] = panel
                }
            }
        }

        guard let generic else { throw PanelDecodingError.missingPanels }
        return PanelStore(panels: panels, appPanels: appPanels, generic: generic)
    }
}
