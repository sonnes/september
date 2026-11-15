import CoreGraphics

public struct KeyRow: Sendable, Identifiable {
    public let id: KeyboardRow
    public let keys: [KeyDefinition]
}

/// The US keyboard in the 75% layout of a Keychron K2.
///
/// Each row is 16 units wide. A key carries its width in units as its
/// weight. The right column holds the navigation keys, and the arrows sit
/// under the right shift.
public enum KeyboardLayout {
    /// The width of each row, in units of a standard key.
    public static let units: CGFloat = 16

    public static let rows: [KeyRow] = [
        KeyRow(id: .function, keys: functionRow),
        KeyRow(id: .number, keys: numberRow),
        KeyRow(id: .qwerty, keys: qwertyRow),
        KeyRow(id: .home, keys: homeRow),
        KeyRow(id: .shift, keys: shiftRow),
        KeyRow(id: .bottom, keys: bottomRow),
    ]

    /// Widths for one row on a grid of `units` columns. A key of weight `w`
    /// spans `w` columns and the gaps between them, so a key edge in one row
    /// lines up with the key edges in the other rows.
    public static func widths(
        for row: KeyRow,
        totalWidth: CGFloat = Metrics.keyboardWidth,
        spacing: CGFloat = Metrics.rowSpacing
    ) -> [CGFloat] {
        let unit = (totalWidth - spacing * (units - 1)) / units
        return row.keys.map { $0.weight * unit + ($0.weight - 1) * spacing }
    }

    // MARK: - Rows

    private static let functionRow: [KeyDefinition] = {
        var keys: [KeyDefinition] = [
            KeyDefinition(id: "esc", kind: .function, label: "esc", action: .virtual(.escape))
        ]
        for number in 1...12 {
            keys.append(
                KeyDefinition(
                    id: "f\(number)",
                    kind: .function,
                    label: "F\(number)",
                    action: .function(number)
                )
            )
        }
        keys += [
            KeyDefinition(id: "screenshot", kind: .function, label: "", action: .system(.screenshot)),
            KeyDefinition(id: "forward-delete", kind: .function, label: "⌦", action: .virtual(.forwardDelete)),
            KeyDefinition(id: "lock-screen", kind: .function, label: "", action: .system(.lockScreen)),
        ]
        return keys
    }()

    private static let numberRow: [KeyDefinition] = {
        let pairs: [(primary: String, secondary: String)] = [
            ("`", "~"), ("1", "!"), ("2", "@"), ("3", "#"), ("4", "$"), ("5", "%"),
            ("6", "^"), ("7", "&"), ("8", "*"), ("9", "("), ("0", ")"), ("-", "_"), ("=", "+"),
        ]
        var keys = pairs.map { dualKey(primary: $0.primary, secondary: $0.secondary) }
        keys += [
            KeyDefinition(id: "delete", kind: .special, label: "⌫", weight: 2, action: .virtual(.delete)),
            navigationKey("home", label: "home", .home),
        ]
        return keys
    }()

    private static let qwertyRow: [KeyDefinition] =
        [
            KeyDefinition(id: "tab", kind: .special, label: "⇥", weight: 1.5, action: .virtual(.tab))
        ]
        + "QWERTYUIOP".map(letterKey)
        + [
            dualKey(primary: "[", secondary: "{"),
            dualKey(primary: "]", secondary: "}"),
            dualKey(primary: "\\", secondary: "|", weight: 1.5),
            navigationKey("page-up", label: "pg up", .pageUp),
        ]

    private static let homeRow: [KeyDefinition] =
        [
            KeyDefinition(
                id: "capslock",
                kind: .special,
                label: "⇪",
                weight: 1.75,
                action: .modifier(.capsLock),
                // Caps lock is not a held modifier, so it has no derived name.
                accessibilityLabel: "Caps Lock"
            )
        ]
        + "ASDFGHJKL".map(letterKey)
        + [
            dualKey(primary: ";", secondary: ":"),
            dualKey(primary: "'", secondary: "\""),
            KeyDefinition(id: "return", kind: .special, label: "↩", weight: 2.25, action: .virtual(.return)),
            navigationKey("page-down", label: "pg dn", .pageDown),
        ]

    private static let shiftRow: [KeyDefinition] =
        [
            KeyDefinition(id: "shift-left", kind: .special, label: "⇧", weight: 2.25, action: .modifier(.shift))
        ]
        + "ZXCVBNM".map(letterKey)
        + [
            dualKey(primary: ",", secondary: "<"),
            dualKey(primary: ".", secondary: ">"),
            dualKey(primary: "/", secondary: "?"),
            KeyDefinition(id: "shift-right", kind: .special, label: "⇧", weight: 1.75, action: .modifier(.shift)),
            navigationKey("arrow-up", label: "↑", .up),
            navigationKey("end", label: "end", .end),
        ]

    private static let bottomRow: [KeyDefinition] = [
        KeyDefinition(
            id: "control-left", kind: .special, label: "⌃", weight: 1.25, action: .modifier(.control)),
        KeyDefinition(
            id: "option-left", kind: .special, label: "⌥", weight: 1.25, action: .modifier(.option)),
        KeyDefinition(
            id: "command-left", kind: .special, label: "⌘", weight: 1.25, action: .modifier(.command)),
        KeyDefinition(
            id: "space", kind: .special, label: "space", weight: 6.25, action: .virtual(.space)),
        KeyDefinition(id: "command-right", kind: .special, label: "⌘", action: .modifier(.command)),
        KeyDefinition(id: "fn", kind: .special, label: "fn", action: .modifier(.function)),
        KeyDefinition(id: "control-right", kind: .special, label: "⌃", action: .modifier(.control)),
        navigationKey("arrow-left", label: "←", .left),
        navigationKey("arrow-down", label: "↓", .down),
        navigationKey("arrow-right", label: "→", .right),
    ]

    // MARK: - Key builders

    private static func letterKey(_ letter: Character) -> KeyDefinition {
        KeyDefinition(
            id: "key-\(letter.lowercased())",
            kind: .standard,
            label: String(letter),
            action: .character(letter.lowercased())
        )
    }

    private static func dualKey(primary: String, secondary: String, weight: CGFloat = 1) -> KeyDefinition {
        KeyDefinition(
            id: "key-\(primary)",
            kind: .dual,
            label: primary,
            secondaryLabel: secondary,
            weight: weight,
            action: .character(primary)
        )
    }

    private static func navigationKey(_ id: String, label: String, _ key: VirtualKey) -> KeyDefinition {
        KeyDefinition(id: id, kind: .special, label: label, action: .virtual(key))
    }
}
