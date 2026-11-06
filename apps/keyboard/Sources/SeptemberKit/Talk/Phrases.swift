import Foundation

/// The Phrases panel of Talk mode, from `Resources/Panels/phrases.json`.
/// Each button is a text action that goes into the bar.
public enum Phrases {
    /// Throws when the file is missing or does not decode.
    public static func bundled() throws -> PanelDefinition {
        guard
            let url = Bundle.module.url(
                forResource: "phrases", withExtension: "json", subdirectory: "Panels")
        else {
            throw PanelDecodingError.missingPanel("phrases")
        }
        return try JSONDecoder().decode(PanelDefinition.self, from: Data(contentsOf: url))
    }
}
