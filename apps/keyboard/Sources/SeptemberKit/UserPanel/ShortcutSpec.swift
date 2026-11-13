/// Keys as the user types them in the settings: `cmd+shift+v`, `⇧⌘V`,
/// `ctrl+c ctrl+c`, or `esc esc`. A space separates the steps of a sequence.
public enum ShortcutSpec {
    /// The shortcuts in the text, or `nil` when a step names no known key.
    public static func parse(_ text: String) -> [Shortcut]? {
        let steps = text.split(whereSeparator: \.isWhitespace).map(String.init)
        guard !steps.isEmpty else { return nil }
        var shortcuts: [Shortcut] = []
        for step in steps {
            guard let shortcut = parseStep(step) else { return nil }
            shortcuts.append(shortcut)
        }
        return shortcuts
    }

    /// The spec that `parse` reads back to the same shortcuts.
    public static func format(_ shortcuts: [Shortcut]) -> String {
        shortcuts.map { $0.names.joined(separator: "+") }.joined(separator: " ")
    }

    private static let modifierNames: [String: Modifiers] = [
        "cmd": .command, "command": .command, "⌘": .command,
        "shift": .shift, "⇧": .shift,
        "ctrl": .control, "control": .control, "⌃": .control,
        "opt": .option, "option": .option, "alt": .option, "⌥": .option,
        "fn": .function, "function": .function,
    ]

    private static let keyAliases: [String: VirtualKey] = [
        "esc": .escape, "⎋": .escape, "enter": .return, "↩": .return, "⇥": .tab,
        "backspace": .delete, "⌫": .delete, "del": .forwardDelete, "⌦": .forwardDelete,
        "pgup": .pageUp, "⇞": .pageUp, "pgdn": .pageDown, "⇟": .pageDown,
        "←": .left, "→": .right, "↑": .up, "↓": .down, "␣": .space,
    ]

    private static func parseStep(_ step: String) -> Shortcut? {
        var modifiers: Modifiers = []
        var keyName: Substring

        if step.contains("+"), step.count > 1 {
            var parts = step.split(separator: "+", omittingEmptySubsequences: false)
            keyName = parts.removeLast()
            for part in parts {
                guard let modifier = modifierNames[part.lowercased()] else { return nil }
                modifiers.insert(modifier)
            }
        } else {
            // Symbol form: the modifier glyphs, then the key.
            keyName = Substring(step)
            while let first = keyName.first, keyName.count > 1,
                let modifier = modifierNames[String(first)]
            {
                modifiers.insert(modifier)
                keyName = keyName.dropFirst()
            }
        }

        guard let key = key(named: String(keyName)) else { return nil }
        return Shortcut(modifiers: modifiers, key: key)
    }

    private static func key(named name: String) -> Shortcut.Key? {
        guard !name.isEmpty else { return nil }
        if let alias = keyAliases[name.lowercased()] { return .virtual(alias) }
        if let virtual = VirtualKey.allCases.first(where: {
            String(describing: $0).lowercased() == name.lowercased()
        }) {
            return .virtual(virtual)
        }
        return name.count == 1 ? .character(name.lowercased()) : nil
    }
}
