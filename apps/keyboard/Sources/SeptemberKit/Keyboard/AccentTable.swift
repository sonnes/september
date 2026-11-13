import Foundation

/// The accents that a held letter shows, as in macOS. The data is in
/// `Resources/Accents/<language>.json`, copied from the press and hold table
/// of macOS (`TextInput_en.bundle`, `Keyboard-en.plist`) without the letter
/// itself.
public struct AccentTable: Sendable {
    private let choices: [String: [String]]

    private init(_ choices: [String: [String]]) {
        self.choices = choices
    }

    /// The accents of `letter`, in the order of macOS. A letter with no
    /// accents has none.
    public func choices(for letter: String) -> [String] {
        choices[letter] ?? []
    }

    public static func bundled(_ language: String) throws -> AccentTable {
        guard let url = Bundle.module.url(forResource: language, withExtension: "json", subdirectory: "Accents")
        else { throw CocoaError(.fileNoSuchFile) }
        return AccentTable(try JSONDecoder().decode([String: [String]].self, from: Data(contentsOf: url)))
    }
}
