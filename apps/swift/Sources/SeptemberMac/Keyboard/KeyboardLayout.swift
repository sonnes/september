import Foundation

public enum KeyboardKeyRole: String, Sendable {
    case character
    case utility
    case modifier
    case primary
}

public struct KeyboardKeySize: Equatable, Sendable {
    public let width: Double
    public let height: Double

    public init(width: Double, height: Double = 52) {
        self.width = width
        self.height = height
    }

    public static let standard = KeyboardKeySize(width: 56)
    public static let small = KeyboardKeySize(width: 48)
    public static let wide = KeyboardKeySize(width: 84)
    public static let extraWide = KeyboardKeySize(width: 116)
    public static let space = KeyboardKeySize(width: 320)
}

public struct KeyboardKey: Equatable, Identifiable, Sendable {
    public let id: String
    public let label: String
    public let output: String?
    public let accessibilityLabel: String
    public let role: KeyboardKeyRole
    public let size: KeyboardKeySize

    public init(
        id: String,
        label: String,
        output: String? = nil,
        accessibilityLabel: String? = nil,
        role: KeyboardKeyRole = .character,
        size: KeyboardKeySize = .standard
    ) {
        self.id = id
        self.label = label
        self.output = output
        self.accessibilityLabel = accessibilityLabel ?? label
        self.role = role
        self.size = size
    }
}

public struct KeyboardRow: Equatable, Identifiable, Sendable {
    public let id: String
    public let keys: [KeyboardKey]

    public init(id: String, keys: [KeyboardKey]) {
        self.id = id
        self.keys = keys
    }
}

public struct QWERTYKeyboardLayout: Equatable, Sendable {
    public let rows: [KeyboardRow]

    public init(rows: [KeyboardRow]) {
        self.rows = rows
    }

    public static let `default` = QWERTYKeyboardLayout(rows: [
        KeyboardRow(
            id: "utilities",
            keys: [
                utility("Esc"), utility("Undo"), utility("Redo"), utility("Cut"), utility("Copy"), utility("Paste"),
                utility("Left"), utility("Right"), utility("Mute"), utility("Vol"), utility("Menu")
            ]
        ),
        KeyboardRow(
            id: "numbers",
            keys: [
                key("`"), key("1"), key("2"), key("3"), key("4"), key("5"), key("6"), key("7"),
                key("8"), key("9"), key("0"), key("-"), key("="), utility("Delete", size: .wide)
            ]
        ),
        KeyboardRow(
            id: "top-letters",
            keys: [
                utility("Tab", output: "\t", size: .wide),
                key("Q"), key("W"), key("E"), key("R"), key("T"), key("Y"), key("U"), key("I"), key("O"), key("P"),
                key("["), key("]"), key("\\")
            ]
        ),
        KeyboardRow(
            id: "home-letters",
            keys: [
                modifier("Caps", size: .extraWide),
                key("A"), key("S"), key("D"), key("F"), key("G"), key("H"), key("J"), key("K"), key("L"), key(";"), key("'"),
                utility("Return", output: "\n", size: .extraWide)
            ]
        ),
        KeyboardRow(
            id: "bottom-letters",
            keys: [
                modifier("Shift", size: .extraWide),
                key("Z"), key("X"), key("C"), key("V"), key("B"), key("N"), key("M"), key(","), key("."), key("/"),
                modifier("Shift", idSuffix: "right", size: .extraWide)
            ]
        ),
        KeyboardRow(
            id: "modifiers",
            keys: [
                modifier("Fn"), modifier("Ctrl"), modifier("Opt"), modifier("Cmd"),
                KeyboardKey(id: "space", label: "Space", output: " ", accessibilityLabel: "Space", role: .primary, size: .space),
                modifier("Cmd", idSuffix: "right"), modifier("Opt", idSuffix: "right"),
                utility("←", id: "arrow-left", accessibilityLabel: "Left Arrow"),
                utility("↓", id: "arrow-down", accessibilityLabel: "Down Arrow"),
                utility("↑", id: "arrow-up", accessibilityLabel: "Up Arrow"),
                utility("→", id: "arrow-right", accessibilityLabel: "Right Arrow")
            ]
        )
    ])
}

private func key(_ label: String) -> KeyboardKey {
    let output = label.count == 1 ? label.lowercased() : label
    return KeyboardKey(id: "key-\(label)", label: label, output: output)
}

private func utility(
    _ label: String,
    id: String? = nil,
    output: String? = nil,
    accessibilityLabel: String? = nil,
    size: KeyboardKeySize = .small
) -> KeyboardKey {
    KeyboardKey(
        id: id ?? "utility-\(label)",
        label: label,
        output: output,
        accessibilityLabel: accessibilityLabel,
        role: .utility,
        size: size
    )
}

private func modifier(_ label: String, idSuffix: String = "left", size: KeyboardKeySize = .standard) -> KeyboardKey {
    KeyboardKey(
        id: "modifier-\(label)-\(idSuffix)",
        label: label,
        accessibilityLabel: label,
        role: .modifier,
        size: size
    )
}
