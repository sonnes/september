import Foundation

/// The accents that a held letter shows, as in macOS. The data is in
/// `Resources/Accents/<language>.json`, copied from the press and hold table
/// of macOS (`TextInput_en.bundle`, `Keyboard-en.plist`) without the letter
/// itself.
public struct AccentTable: Sendable {
    private let choices: [String: [String]]

    public init(_ choices: [String: [String]]) {
        self.choices = choices
    }

    /// The accents of `letter`, in the order of macOS. A letter with no
    /// accents has none.
    public func choices(for letter: String) -> [String] {
        choices[letter] ?? []
    }

    /// Loads `Resources/Accents/<language>.json`.
    public static func bundled(_ language: String) throws -> AccentTable {
        guard let url = Bundle.module.url(forResource: language, withExtension: "json", subdirectory: "Accents")
        else { throw CocoaError(.fileNoSuchFile) }
        return AccentTable(try JSONDecoder().decode([String: [String]].self, from: Data(contentsOf: url)))
    }

    /// The accents of the English keyboard. A check makes sure that the file
    /// loads.
    public static let english = (try? bundled("en")) ?? AccentTable([:])
}
