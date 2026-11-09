import Foundation

/// The panels shipped with the app: the Text, System, and Rectangle keypads,
/// and the two panels of Write.
///
/// File names are the identity: `text.json`, `system.json`, `rectangle.json`,
/// `write.json`, and `write-documents.json`.
public struct PanelStore: Sendable {
    public let text: PanelDefinition
    public let system: PanelDefinition
    /// The recommended shortcuts of Rectangle, the window manager.
    public let rectangle: PanelDefinition
    /// The keys of the Write paper.
    public let write: PanelDefinition
    /// The keys of the Write desk.
    public let writeDocuments: PanelDefinition

    public init(
        text: PanelDefinition,
        system: PanelDefinition,
        rectangle: PanelDefinition,
        write: PanelDefinition,
        writeDocuments: PanelDefinition
    ) {
        self.text = text
        self.system = system
        self.rectangle = rectangle
        self.write = write
        self.writeDocuments = writeDocuments
    }

    /// The panel of Write for `WritePanel.id` or `WritePanel.documentsID`,
    /// and nil for any other app.
    public func writePanel(for bundleID: String?) -> PanelDefinition? {
        switch bundleID {
        case WritePanel.id: write
        case WritePanel.documentsID: writeDocuments
        default: nil
        }
    }

    /// Loads the panels from `Resources/Panels`. Throws when a panel is
    /// missing or a file does not decode.
    public static func bundled() throws -> PanelStore {
        guard let root = Bundle.module.url(forResource: "Panels", withExtension: nil) else {
            throw PanelDecodingError.missingPanel("Panels")
        }
        let decoder = JSONDecoder()

        func load(_ name: String) throws -> PanelDefinition {
            let url = root.appendingPathComponent(name).appendingPathExtension("json")
            guard FileManager.default.fileExists(atPath: url.path) else {
                throw PanelDecodingError.missingPanel(name)
            }
            return try decoder.decode(PanelDefinition.self, from: Data(contentsOf: url))
        }

        return PanelStore(
            text: try load("text"),
            system: try load("system"),
            rectangle: try load("rectangle"),
            write: try load("write"),
            writeDocuments: try load("write-documents")
        )
    }
}
