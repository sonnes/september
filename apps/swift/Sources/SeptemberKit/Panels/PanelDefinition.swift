import Foundation

/// What a panel button does. Deliberately the same vocabulary Apple's
/// Accessibility Keyboard uses for `.ascconfig` panels: press a key macro,
/// type a string, or open another panel.
public enum PanelAction: Sendable, Hashable {
    case shortcut(Shortcut)
    case text(String)
    case openPanel(String)
}

/// One button in a shortcut panel.
public struct PanelButton: Sendable, Hashable, Identifiable {
    public let id: String
    public let label: String
    /// SF Symbol name.
    public let symbol: String?
    public let action: PanelAction

    /// The key combination printed on the button, if it has one.
    public var hint: String? {
        guard case .shortcut(let shortcut) = action else { return nil }
        return shortcut.display
    }

    public var accessibilityLabel: String {
        switch action {
        case .shortcut(let shortcut): "\(label), \(shortcut.spokenName)"
        case .text: label
        case .openPanel: "\(label), opens panel"
        }
    }
}

/// A grid of shortcut buttons — the left EDIT keypad, the right NAVIGATE
/// keypad, or the shortcuts for the app currently in front.
public struct PanelDefinition: Sendable, Hashable, Identifiable {
    public let id: String
    public let title: String
    public let columns: Int
    public let buttons: [PanelButton]

    public init(id: String, title: String, columns: Int, buttons: [PanelButton]) {
        self.id = id
        self.title = title
        self.columns = columns
        self.buttons = buttons
    }
}

// MARK: - Decoding

extension PanelDefinition: Decodable {
    enum CodingKeys: String, CodingKey {
        case id, title, columns, buttons
    }
}

extension PanelButton: Decodable {
    enum CodingKeys: String, CodingKey {
        case id, label, symbol, action
    }
}

extension PanelAction: Decodable {
    enum CodingKeys: String, CodingKey {
        case type, modifiers, key, text, panel
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "shortcut":
            let names = try container.decodeIfPresent([String].self, forKey: .modifiers) ?? []
            let key = try container.decode(String.self, forKey: .key)
            self = .shortcut(
                Shortcut(modifiers: try Modifiers(names: names), key: try Shortcut.Key(name: key))
            )
        case "text":
            self = .text(try container.decode(String.self, forKey: .text))
        case "openPanel":
            self = .openPanel(try container.decode(String.self, forKey: .panel))
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "unknown panel action type '\(type)'"
            )
        }
    }
}

extension Modifiers {
    /// Modifier names as written in panel JSON.
    public init(names: [String]) throws {
        var modifiers: Modifiers = []
        for name in names {
            switch name {
            case "shift": modifiers.insert(.shift)
            case "control": modifiers.insert(.control)
            case "option": modifiers.insert(.option)
            case "command": modifiers.insert(.command)
            case "function": modifiers.insert(.function)
            default:
                throw PanelDecodingError.unknownModifier(name)
            }
        }
        self = modifiers
    }
}

extension Shortcut.Key {
    /// A single character is typed as-is; anything longer names a virtual key.
    init(name: String) throws {
        if name.count == 1 {
            self = .character(name)
        } else if let virtual = VirtualKey(name: name) {
            self = .virtual(virtual)
        } else {
            throw PanelDecodingError.unknownKey(name)
        }
    }
}

public enum PanelDecodingError: Error, CustomStringConvertible {
    case unknownModifier(String)
    case unknownKey(String)
    case missingPanels

    public var description: String {
        switch self {
        case .unknownModifier(let name): "unknown modifier '\(name)'"
        case .unknownKey(let name): "unknown key '\(name)'"
        case .missingPanels: "no panel definitions found in the app bundle"
        }
    }
}
