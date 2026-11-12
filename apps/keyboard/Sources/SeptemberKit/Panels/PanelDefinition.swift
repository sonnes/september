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

extension PanelAction {
    /// What the button does while the user holds it. A key that repeats on
    /// a hardware keyboard, such as an arrow or Delete, repeats alone or
    /// with Shift or Option, so a held button moves the caret or extends the
    /// selection. A chord with Command or Control acts once, so a long dwell
    /// does not press a window or app command again and again.
    public var holdBehavior: HoldBehavior {
        guard case .shortcut(let shortcut) = self,
            case .virtual(let key) = shortcut.key,
            key.repeatsWhenHeld,
            shortcut.modifiers.isSubset(of: [.shift, .option])
        else { return .once }
        return .repeats
    }
}

/// One button in a shortcut panel.
public struct PanelButton: Sendable, Hashable, Identifiable {
    public let id: String
    public let label: String
    /// SF Symbol name.
    public let symbol: String?
    /// The part of the screen that a window takes, for a button that places
    /// a window. A keypad draws it as the icon of the button.
    public let region: WindowRegion?
    public let action: PanelAction

    public init(
        id: String, label: String, symbol: String?, region: WindowRegion? = nil, action: PanelAction
    ) {
        self.id = id
        self.label = label
        self.symbol = symbol
        self.region = region
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
    /// a two-column grid. Text of marks only, such as `# `, is a key instead.
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
}

/// A part of the screen, in fractions of its width and height, from the top
/// left corner.
public struct WindowRegion: Sendable, Hashable, Decodable {
    public let x: Double
    public let y: Double
    public let width: Double
    public let height: Double

    public init(x: Double, y: Double, width: Double, height: Double) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    }
}

/// A block of buttons below the grid of a keypad, with columns of its own.
/// The Text keypad puts its arrows in one, as an inverted T.
public struct PanelBlock: Sendable, Hashable {
    public let columns: Int
    public let buttons: [PanelButton]

    public init(columns: Int, buttons: [PanelButton]) {
        self.columns = columns
        self.buttons = buttons
    }
}

/// A grid of shortcut buttons: a keypad, such as Text or System, or a panel
/// of Write.
public struct PanelDefinition: Sendable, Hashable {
    public let title: String
    public let columns: Int
    public let buttons: [PanelButton]
    /// The arrow keys below the grid, if the keypad has them.
    public let arrows: PanelBlock?

    public init(title: String, columns: Int, buttons: [PanelButton], arrows: PanelBlock? = nil) {
        self.title = title
        self.columns = columns
        self.buttons = buttons
        self.arrows = arrows
    }
}

// MARK: - Decoding

extension PanelBlock: Decodable {}

extension PanelDefinition: Decodable {
    enum CodingKeys: String, CodingKey {
        case title, columns, buttons, arrows
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let buttons = try container.decode([PanelButton].self, forKey: .buttons)
        let arrows = try container.decodeIfPresent(PanelBlock.self, forKey: .arrows)
        var seen: Set<String> = []
        for button in buttons + (arrows?.buttons ?? []) where !seen.insert(button.id).inserted {
            throw PanelDecodingError.duplicateButton(button.id)
        }
        self.init(
            title: try container.decode(String.self, forKey: .title),
            columns: try container.decode(Int.self, forKey: .columns),
            buttons: buttons,
            arrows: arrows
        )
    }
}

extension PanelButton: Decodable {
    enum CodingKeys: String, CodingKey {
        case id, label, symbol, region, action
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
            get throws { try PanelAction.shortcut(modifiers: modifiers ?? [], key: key) }
        }
    }

    /// A shortcut of panel JSON. An uppercase letter is rejected: a shifted
    /// key names "shift" among the modifiers.
    private static func shortcut(modifiers: [String], key: String) throws -> Shortcut {
        guard key.count != 1 || key == key.lowercased() else { throw PanelDecodingError.uppercaseKey(key) }
        return Shortcut(modifiers: try Modifiers(names: modifiers), key: try Shortcut.Key(name: key))
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "shortcut":
            let names = try container.decodeIfPresent([String].self, forKey: .modifiers) ?? []
            let key = try container.decode(String.self, forKey: .key)
            self = .shortcut(try PanelAction.shortcut(modifiers: names, key: key))
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
    case uppercaseKey(String)
    case duplicateButton(String)
    case missingPanel(String)

    public var description: String {
        switch self {
        case .unknownModifier(let name): "unknown modifier '\(name)'"
        case .unknownKey(let name): "unknown key '\(name)'"
        case .uppercaseKey(let name):
            "key '\(name)' is uppercase. Write it in lowercase and add \"shift\" to the modifiers."
        case .duplicateButton(let id): "two buttons share the id '\(id)'"
        case .missingPanel(let name): "no panel '\(name)' in the app bundle"
        }
    }
}
