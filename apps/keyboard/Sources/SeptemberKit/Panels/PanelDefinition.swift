import Foundation

/// What a panel button does: press a key combination or type a phrase.
public enum PanelAction: Sendable, Hashable {
    case shortcut(Shortcut)
    case text(String)
}

/// One button in a shortcut panel.
public struct PanelButton: Sendable, Hashable, Identifiable {
    public let id: String
    public let label: String
    /// SF Symbol name.
    public let symbol: String?
    public let action: PanelAction

    public init(id: String, label: String, symbol: String?, action: PanelAction) {
        self.id = id
        self.label = label
        self.symbol = symbol
        self.action = action
    }

    /// The key combination printed on the button, if it has one.
    public var hint: String? {
        guard case .shortcut(let shortcut) = action else { return nil }
        return shortcut.display
    }

    public var accessibilityLabel: String {
        switch action {
        case .shortcut(let shortcut): "\(label), \(shortcut.spokenName)"
        case .text: label
        }
    }
}

/// A grid of shortcut buttons: the EDIT, NAVIGATE and SYSTEM keypads, or the
/// shortcuts for the app in front.
public struct PanelDefinition: Sendable, Hashable {
    public let title: String
    public let buttons: [PanelButton]

    public init(title: String, buttons: [PanelButton]) {
        self.title = title
        self.buttons = buttons
    }
}

// MARK: - Decoding

extension PanelDefinition: Decodable {
    enum CodingKeys: String, CodingKey {
        case title, buttons
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let buttons = try container.decode([PanelButton].self, forKey: .buttons)
        var seen: Set<String> = []
        for button in buttons where !seen.insert(button.id).inserted {
            throw PanelDecodingError.duplicateButton(button.id)
        }
        self.init(
            title: try container.decode(String.self, forKey: .title),
            buttons: buttons
        )
    }
}

extension PanelButton: Decodable {
    enum CodingKeys: String, CodingKey {
        case id, label, symbol, action
    }
}

extension PanelAction: Decodable {
    enum CodingKeys: String, CodingKey {
        case type, modifiers, key, text
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "shortcut":
            let names = try container.decodeIfPresent([String].self, forKey: .modifiers) ?? []
            let key = try container.decode(String.self, forKey: .key)
            self = .shortcut(
                Shortcut(
                    modifiers: try Modifiers(panelNames: names),
                    key: try Shortcut.Key(panelName: key)
                )
            )
        case "text":
            self = .text(try container.decode(String.self, forKey: .text))
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
    /// The modifier names in panel JSON.
    private static let panelNames: [String: Modifiers] = [
        "function": .function,
        "control": .control,
        "option": .option,
        "shift": .shift,
        "command": .command,
    ]

    init(panelNames names: [String]) throws {
        self = try names.reduce(into: []) { modifiers, name in
            guard let modifier = Modifiers.panelNames[name] else {
                throw PanelDecodingError.unknownModifier(name)
            }
            modifiers.insert(modifier)
        }
    }
}

extension Shortcut.Key {
    /// The virtual key names in panel JSON.
    private static let virtualKeys: [String: VirtualKey] = [
        "return": .return, "tab": .tab, "space": .space, "delete": .delete,
        "escape": .escape, "forwardDelete": .forwardDelete, "home": .home, "end": .end,
        "pageUp": .pageUp, "pageDown": .pageDown,
        "left": .left, "right": .right, "up": .up, "down": .down,
        "f1": .f1, "f2": .f2, "f3": .f3, "f4": .f4, "f5": .f5, "f6": .f6,
        "f7": .f7, "f8": .f8, "f9": .f9, "f10": .f10, "f11": .f11, "f12": .f12,
    ]

    /// A single character types as is. A longer name is a virtual key.
    init(panelName name: String) throws {
        if name.count == 1 {
            self = .character(name)
        } else if let virtual = Shortcut.Key.virtualKeys[name] {
            self = .virtual(virtual)
        } else {
            throw PanelDecodingError.unknownKey(name)
        }
    }
}

public enum PanelDecodingError: Error, CustomStringConvertible {
    case unknownModifier(String)
    case unknownKey(String)
    case duplicateButton(String)
    case missingPanel(String)

    public var description: String {
        switch self {
        case .unknownModifier(let name): "unknown modifier '\(name)'"
        case .unknownKey(let name): "unknown key '\(name)'"
        case .duplicateButton(let id): "two buttons share the id '\(id)'"
        case .missingPanel(let name): "no panel '\(name)' in the app bundle"
        }
    }
}
