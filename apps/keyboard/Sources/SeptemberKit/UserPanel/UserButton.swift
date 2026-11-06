import Foundation

/// What a button of My Panel does.
public enum UserAction: Sendable, Hashable {
    case shortcut(Shortcut)
    /// Shortcuts that the keyboard presses one after the other.
    case sequence([Shortcut])
    /// Text that the settings file holds.
    case text(String)
    /// Text that the Keychain holds, under the ID of the button.
    case privateText
}

/// One button of My Panel.
public struct UserButton: Sendable, Hashable, Identifiable {
    public let id: String
    public var name: String
    public var action: UserAction

    public init(id: String, name: String, action: UserAction) {
        self.id = id
        self.name = name
        self.action = action
    }

    /// A text button takes two columns.
    public var isWide: Bool {
        switch action {
        case .text, .privateText: true
        case .shortcut, .sequence: false
        }
    }

    /// The keys that the button shows, or `nil` for a text button, which shows
    /// its name.
    public var keysLabel: String? {
        switch action {
        case .shortcut(let shortcut): shortcut.display
        case .sequence(let keys): keys.map(\.display).joined(separator: " ")
        case .text, .privateText: nil
        }
    }

    /// The full name. It never holds the text of a private button.
    public var accessibilityLabel: String {
        switch action {
        case .shortcut(let shortcut): "\(name), \(shortcut.spokenName)"
        case .sequence(let keys): "\(name), " + keys.map(\.spokenName).joined(separator: ", then ")
        case .text: name
        case .privateText: "\(name), private text"
        }
    }

    /// The panel actions that a press performs, in order.
    public var panelActions: [PanelAction] {
        switch action {
        case .shortcut(let shortcut): [.shortcut(shortcut)]
        case .sequence(let keys): keys.map { .shortcut($0) }
        case .text(let text): [.text(text)]
        case .privateText: [.privateText(id)]
        }
    }
}

/// What a new button does, before the store decides where its text goes.
public enum NewButtonAction: Sendable, Hashable {
    case shortcut(Shortcut)
    case sequence([Shortcut])
    case text(String)
}

/// A button to add to My Panel, from the settings or from an import.
public struct NewButton: Sendable, Hashable {
    public var name: String
    public var action: NewButtonAction

    public init(name: String, action: NewButtonAction) {
        self.name = name
        self.action = action
    }
}

// MARK: - Never print text

// Text can be private, so a printed value never shows it. This keeps text out
// of logs and out of the failure messages of the tests.

extension UserAction: CustomStringConvertible, CustomDebugStringConvertible {
    public var description: String {
        switch self {
        case .shortcut(let shortcut): "shortcut(\(shortcut.display))"
        case .sequence(let keys): "sequence(\(keys.map(\.display).joined(separator: " ")))"
        case .text: "text(hidden)"
        case .privateText: "privateText"
        }
    }

    public var debugDescription: String { description }
}

extension NewButtonAction: CustomStringConvertible, CustomDebugStringConvertible {
    public var description: String {
        switch self {
        case .shortcut(let shortcut): "shortcut(\(shortcut.display))"
        case .sequence(let keys): "sequence(\(keys.map(\.display).joined(separator: " ")))"
        case .text: "text(hidden)"
        }
    }

    public var debugDescription: String { description }
}

// MARK: - JSON

extension UserButton: Codable {
    enum CodingKeys: String, CodingKey {
        case id, name, action
    }
}

extension UserAction: Codable {
    enum CodingKeys: String, CodingKey {
        case type, modifiers, key, keys, text
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "shortcut":
            self = .shortcut(try ShortcutCoding(from: decoder).shortcut())
        case "sequence":
            let keys = try container.decode([ShortcutCoding].self, forKey: .keys)
            self = .sequence(try keys.map { try $0.shortcut() })
        case "text":
            self = .text(try container.decode(String.self, forKey: .text))
        case "privateText":
            self = .privateText
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type, in: container,
                debugDescription: "unknown My Panel action type '\(type)'")
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .shortcut(let shortcut):
            try container.encode("shortcut", forKey: .type)
            try ShortcutCoding(shortcut).encode(to: encoder)
        case .sequence(let keys):
            try container.encode("sequence", forKey: .type)
            try container.encode(keys.map(ShortcutCoding.init), forKey: .keys)
        case .text(let text):
            try container.encode("text", forKey: .type)
            try container.encode(text, forKey: .text)
        case .privateText:
            try container.encode("privateText", forKey: .type)
        }
    }
}

/// A shortcut as the panel JSON writes it: `{"modifiers": ["command"], "key": "s"}`.
struct ShortcutCoding: Codable {
    let modifiers: [String]
    let key: String

    init(_ shortcut: Shortcut) {
        modifiers = shortcut.modifiers.heldKeys.map(\.name)
        switch shortcut.key {
        case .character(let character): key = character
        case .virtual(let virtual): key = String(describing: virtual)
        }
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: UserAction.CodingKeys.self)
        modifiers = try container.decodeIfPresent([String].self, forKey: .modifiers) ?? []
        key = try container.decode(String.self, forKey: .key)
    }

    func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: UserAction.CodingKeys.self)
        try container.encode(modifiers, forKey: .modifiers)
        try container.encode(key, forKey: .key)
    }

    func shortcut() throws -> Shortcut {
        Shortcut(modifiers: try Modifiers(names: modifiers), key: try Shortcut.Key(name: key))
    }
}
