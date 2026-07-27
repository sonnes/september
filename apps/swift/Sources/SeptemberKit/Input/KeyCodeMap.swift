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

    /// - Parameter probe: what the layout produces for a key code held with
    ///   the given modifiers, or nil if it produces nothing.
    public init(keyCodes: Range<UInt16> = 0..<128, probe: (UInt16, Modifiers) -> String?) {
        var table: [String: Resolved] = [:]
        // Plain keys win over shifted and option-shifted spellings of the same
        // character, so probe in increasing order of effort.
        for modifiers: Modifiers in [[], .shift, .option, [.option, .shift]] {
            for code in keyCodes {
                guard let produced = probe(code, modifiers), !produced.isEmpty else { continue }
                if table[produced] == nil {
                    table[produced] = Resolved(virtualKey: code, modifiers: modifiers)
                }
            }
        }
        self.table = table
    }

    public func keystroke(for character: Character) -> Resolved? {
        table[String(character)]
    }

    public func keystroke(for text: String) -> Resolved? {
        table[text]
    }
}
