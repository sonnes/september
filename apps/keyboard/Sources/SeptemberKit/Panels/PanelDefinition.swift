import Foundation

/// What a panel button does: press a key combination, press several in
/// order, or type a phrase.
public enum PanelAction: Sendable, Hashable {
    case shortcut(Shortcut)
    /// Key combinations pressed one after the other, such as esc esc.
    case sequence([Shortcut])
    case text(String)
    /// The text of a private button of My Panel, by the ID of the button. The
    /// text is in the Keychain.
    case privateText(String)
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

    /// The keys printed on the button, if it presses keys.
    public var hint: String? {
        switch action {
        case .shortcut(let shortcut): shortcut.display
        case .sequence(let steps): steps.map(\.display).joined(separator: " ")
        case .text(let text): Self.marks(text)
        case .privateText: nil
        }
    }

    public var accessibilityLabel: String {
        switch action {
        case .shortcut(let shortcut): "\(label), \(shortcut.spokenName)"
        case .sequence(let steps):
            "\(label), \(steps.map(\.spokenName).joined(separator: ", then "))"
        case .text, .privateText: label
        }
    }

    /// A button that types words. It shows the text and takes a whole row of
    /// an app panel. Text of marks only, such as `# `, is a key instead.
    public var isText: Bool {
        if case .text(let text) = action { return Self.marks(text) == nil }
        return false
    }

    /// The text without spaces, if it has no letters or digits.
    private static func marks(_ text: String) -> String? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.rangeOfCharacter(from: .alphanumerics) == nil else {
            return nil
        }
        return trimmed
    }

    /// The prefix of the ID of a button that `ShortcutLearner` added.
    public static let learnedPrefix = "learned."

    /// True for a chord that the keyboard learned from the hardware keyboard.
    public var isLearned: Bool { id.hasPrefix(PanelButton.learnedPrefix) }
}

/// A grid of shortcut buttons: the Edit, Text, and System keypads, or the
/// shortcuts for the app in front.
public struct PanelDefinition: Sendable, Hashable {
    public let title: String
    public let columns: Int
    public let buttons: [PanelButton]

    public init(title: String, columns: Int, buttons: [PanelButton]) {
        self.title = title
        self.columns = columns
        self.buttons = buttons
    }

    /// The chords that the buttons press on their own.
    public var shortcuts: Set<Shortcut> {
        Set(buttons.compactMap { button in
            if case .shortcut(let shortcut) = button.action { return shortcut }
            return nil
        })
    }

    /// The same panel with other buttons after its own. A button whose ID is
    /// already in the panel is skipped.
    public func appending(_ extra: [PanelButton]) -> PanelDefinition {
        let ids = Set(buttons.map(\.id))
        return PanelDefinition(
            title: title, columns: columns,
            buttons: buttons + extra.filter { !ids.contains($0.id) })
    }

    /// The same panel with these buttons.
    public func with(buttons: [PanelButton]) -> PanelDefinition {
        PanelDefinition(title: title, columns: columns, buttons: buttons)
    }
}

// MARK: - Decoding

extension PanelDefinition: Decodable {
    enum CodingKeys: String, CodingKey {
        case title, columns, buttons
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
            columns: try container.decode(Int.self, forKey: .columns),
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
        case type, modifiers, key, keys, text
    }

    /// One step of a sequence: `{"modifiers": ["control"], "key": "c"}`.
    private struct Step: Decodable {
        let modifiers: [String]?
        let key: String

        var shortcut: Shortcut {
            get throws {
                Shortcut(modifiers: try Modifiers(names: modifiers ?? []), key: try Shortcut.Key(name: key))
            }
        }
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
        case "sequence":
            let steps = try container.decode([Step].self, forKey: .keys)
            guard !steps.isEmpty else {
                throw DecodingError.dataCorruptedError(
                    forKey: .keys, in: container, debugDescription: "a sequence has no keys")
            }
            self = .sequence(try steps.map { try $0.shortcut })
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

extension Shortcut.Key {
    /// A single character is typed as-is; anything longer names a virtual key.
    public init(name: String) throws {
        if name.count == 1 {
            self = .character(name)
        } else if let virtual = VirtualKey(name: name) {
            self = .virtual(virtual)
        } else {
            throw PanelDecodingError.unknownKey(name)
        }
    }

    /// The name in panel JSON: the character, or the name of the virtual key.
    public var name: String {
        switch self {
        case .character(let character): character
        case .virtual(let virtual): String(describing: virtual)
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
