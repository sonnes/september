import CoreGraphics

/// One row of the main keyboard.
public struct KeyRow: Sendable, Identifiable {
    public let id: KeyboardRow
    public let keys: [KeyDefinition]
}

/// The US QWERTY keyboard from the design mock.
///
/// Keys carry a *weight*, not a fixed width: the component library sizes
/// (48pt standard, 60pt special) are the gallery defaults, while an assembled
/// row fills the 980pt keyboard proportionally, as the mock shows.
public enum KeyboardLayout {
    public static let rows: [KeyRow] = [
        KeyRow(id: .function, keys: functionRow),
        KeyRow(id: .number, keys: numberRow),
        KeyRow(id: .qwerty, keys: qwertyRow),
        KeyRow(id: .home, keys: homeRow),
        KeyRow(id: .shift, keys: shiftRow),
        KeyRow(id: .bottom, keys: bottomRow),
    ]

    /// Widths for one row, filling `totalWidth` exactly.
    public static func widths(
        for row: KeyRow,
        totalWidth: CGFloat = Metrics.keyboardWidth,
        spacing: CGFloat = Metrics.rowSpacing
    ) -> [CGFloat] {
        let available = totalWidth - spacing * CGFloat(row.keys.count - 1)
        let totalWeight = row.keys.reduce(0) { $0 + $1.weight }
        guard totalWeight > 0 else { return row.keys.map { _ in 0 } }
        return row.keys.map { available * $0.weight / totalWeight }
    }

    // MARK: - Rows

    private static let functionRow: [KeyDefinition] = {
        var keys: [KeyDefinition] = [
            KeyDefinition(
                id: "esc",
                kind: .function,
                label: "esc",
                weight: 1.5,
                action: .virtual(.escape),
                accessibilityLabel: "Escape"
            )
        ]
        for number in 1...12 {
            keys.append(
                KeyDefinition(
                    id: "f\(number)",
                    kind: .function,
                    label: "F\(number)",
                    action: .virtual(VirtualKey.function(number)!),
                    accessibilityLabel: "F\(number)"
                )
            )
        }
        return keys
    }()

    private static let numberRow: [KeyDefinition] = {
        let pairs: [(primary: String, secondary: String)] = [
            ("`", "~"), ("1", "!"), ("2", "@"), ("3", "#"), ("4", "$"), ("5", "%"),
            ("6", "^"), ("7", "&"), ("8", "*"), ("9", "("), ("0", ")"), ("-", "_"), ("=", "+"),
        ]
        var keys = pairs.map { dualKey(primary: $0.primary, secondary: $0.secondary) }
        keys.append(
            KeyDefinition(
                id: "delete",
                kind: .special,
                label: "delete",
                weight: 1.5,
                action: .virtual(.delete),
                accessibilityLabel: "Delete"
            )
        )
        return keys
    }()

    private static let qwertyRow: [KeyDefinition] =
        [
            KeyDefinition(
                id: "tab",
                kind: .special,
                label: "tab",
                weight: 1.5,
                action: .virtual(.tab),
                accessibilityLabel: "Tab"
            )
        ]
        + "QWERTYUIOP".map(letterKey)
        + [
            dualKey(primary: "[", secondary: "{"),
            dualKey(primary: "]", secondary: "}"),
            dualKey(primary: "\\", secondary: "|"),
        ]

    private static let homeRow: [KeyDefinition] =
        [
            KeyDefinition(
                id: "capslock",
                kind: .special,
                label: "caps lock",
                weight: 1.75,
                action: .modifier(.capsLock),
                accessibilityLabel: "Caps Lock"
            )
        ]
        + "ASDFGHJKL".map(letterKey)
        + [
            dualKey(primary: ";", secondary: ":"),
            dualKey(primary: "'", secondary: "\""),
            KeyDefinition(
                id: "return",
                kind: .special,
                label: "return",
                weight: 1.75,
                action: .virtual(.return),
                accessibilityLabel: "Return"
            ),
        ]

    private static let shiftRow: [KeyDefinition] =
        [
            KeyDefinition(
                id: "shift-left",
                kind: .special,
                label: "shift",
                weight: 2.25,
                action: .modifier(.shift),
                accessibilityLabel: "Shift"
            )
        ]
        + "ZXCVBNM".map(letterKey)
        + [
            dualKey(primary: ",", secondary: "<"),
            dualKey(primary: ".", secondary: ">"),
            dualKey(primary: "/", secondary: "?"),
            KeyDefinition(
                id: "shift-right",
                kind: .special,
                label: "shift",
                weight: 2.25,
                action: .modifier(.shift),
                accessibilityLabel: "Shift"
            ),
        ]

    private static let bottomRow: [KeyDefinition] = [
        KeyDefinition(
            id: "fn", kind: .special, label: "fn", weight: 1.2,
            action: .modifier(.function), accessibilityLabel: "Function"
        ),
        KeyDefinition(
            id: "control", kind: .special, label: "control", weight: 1.2,
            action: .modifier(.control), accessibilityLabel: "Control"
        ),
        KeyDefinition(
            id: "option-left", kind: .special, label: "option", weight: 1.2,
            action: .modifier(.option), accessibilityLabel: "Option"
        ),
        KeyDefinition(
            id: "command-left", kind: .special, label: "command", weight: 1.4,
            action: .modifier(.command), accessibilityLabel: "Command"
        ),
        KeyDefinition(
            id: "space", kind: .special, label: "space", weight: 6.5,
            action: .virtual(.space), accessibilityLabel: "Space"
        ),
        KeyDefinition(
            id: "command-right", kind: .special, label: "command", weight: 1.4,
            action: .modifier(.command), accessibilityLabel: "Command"
        ),
        KeyDefinition(
            id: "option-right", kind: .special, label: "option", weight: 1.2,
            action: .modifier(.option), accessibilityLabel: "Option"
        ),
    ]

    // MARK: - Key builders

    private static func letterKey(_ letter: Character) -> KeyDefinition {
        KeyDefinition(
            id: "key-\(letter.lowercased())",
            kind: .standard,
            label: String(letter),
            action: .character(letter.lowercased()),
            accessibilityLabel: String(letter)
        )
    }

    private static func dualKey(primary: String, secondary: String) -> KeyDefinition {
        KeyDefinition(
            id: "key-\(primary)",
            kind: .dual,
            label: primary,
            secondaryLabel: secondary,
            action: .character(primary),
            accessibilityLabel: "\(primary), shift for \(secondary)"
        )
    }
}
