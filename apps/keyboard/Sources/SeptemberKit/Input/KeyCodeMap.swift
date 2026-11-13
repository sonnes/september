/// Character → (virtual key, modifiers) for the *current* keyboard layout.
///
/// Hardcoding US QWERTY would break every other layout, so the map is built by
/// asking the layout what each key produces. The probe is injected: the app
/// passes the real `UCKeyTranslate`-backed one, tests pass a table.
public struct KeyCodeMap: Sendable {
    public struct Resolved: Sendable, Equatable {
        public let virtualKey: UInt16
        public let modifiers: Modifiers
    }

    private let table: [String: Resolved]
    private let shortcutTable: [String: Resolved]

    /// - Parameters:
    ///   - probe: what the layout produces for a key code held with the given
    ///     modifiers, or nil if it produces nothing.
    ///   - shortcutProbe: the same for the ASCII-capable layout. macOS uses
    ///     that layout for a shortcut on a layout without Latin letters.
    public init(
        probe: (UInt16, Modifiers) -> String?,
        shortcutProbe: ((UInt16, Modifiers) -> String?)? = nil
    ) {
        table = Self.table(probe)
        shortcutTable = shortcutProbe.map(Self.table) ?? [:]
    }

    private static func table(_ probe: (UInt16, Modifiers) -> String?) -> [String: Resolved] {
        var table: [String: Resolved] = [:]
        for modifiers: Modifiers in [[], .shift, .option, [.option, .shift]] {
            for code: UInt16 in 0..<128 {
                guard let produced = probe(code, modifiers), !produced.isEmpty else { continue }
                if table[produced] == nil {
                    table[produced] = Resolved(virtualKey: code, modifiers: modifiers)
                }
            }
        }
        return table
    }

    public func keystroke(for text: String) -> Resolved? {
        table[text]
    }

    /// The key for the character of a shortcut, such as the Z of ⌘Z.
    public func shortcutKeystroke(for character: String) -> Resolved? {
        table[character] ?? shortcutTable[character]
    }
}
