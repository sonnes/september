import Foundation

/// What a button does: press a key combination, press several in order, or
/// type a phrase. The panels and My Panel use it.
public enum PanelAction: Sendable, Hashable {
    case shortcut(Shortcut)
    /// Key combinations pressed one after the other, such as esc esc.
    case sequence([Shortcut])
    case text(String)
    /// The text of a private button of My Panel, by the ID of the button. The
    /// text is in the Keychain.
    case privateText(String)
    /// Scrolls the place where the pointer last rested outside the keyboard.
    case scroll(ScrollDirection)
}

extension PanelAction {
    /// What the button does while the user holds it. A scroll repeats. A
    /// shortcut follows the rule of a held key. Everything else acts once.
    public var holdBehavior: HoldBehavior {
        if case .scroll = self { return .repeats }
        guard case .shortcut(let shortcut) = self, case .virtual(let key) = shortcut.key else { return .once }
        return .forKey(key, modifiers: shortcut.modifiers)
    }
}

// MARK: - Presentation

extension PanelAction {
    /// The keys that the action presses, such as "⌃C ⌃C", or `nil` when it
    /// presses no keys.
    public var keysLabel: String? {
        switch self {
        case .shortcut(let shortcut): shortcut.display
        case .sequence(let steps): steps.map(\.display).joined(separator: " ")
        case .text, .privateText, .scroll: nil
        }
    }

    /// The keys printed on the button: the keys it presses, or text of
    /// marks only, such as `#`.
    public var hint: String? {
        if case .text(let text) = self { return Self.marks(text) }
        return keysLabel
    }

    /// The spoken name of a button with this action. It never holds the text
    /// of a private button.
    public func accessibilityLabel(name: String) -> String {
        switch self {
        case .shortcut(let shortcut): "\(name), \(shortcut.spokenName)"
        case .sequence(let steps): "\(name), \(steps.map(\.spokenName).joined(separator: ", then "))"
        case .privateText: "\(name), private text"
        case .text, .scroll: name
        }
    }

    /// An action that types words. Its button shows its name or text and
    /// takes a whole row of a two-column grid. Text of marks only, such as
    /// `# `, is a key instead.
    public var isText: Bool {
        switch self {
        case .text(let text): Self.marks(text) == nil
        case .privateText: true
        case .shortcut, .sequence, .scroll: false
        }
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

// Text can be private, so a printed action never shows it. This keeps text
// out of logs and out of the failure messages of the tests.
extension PanelAction: CustomStringConvertible, CustomDebugStringConvertible {
    public var description: String {
        switch self {
        case .shortcut: "shortcut(\(keysLabel ?? ""))"
        case .sequence: "sequence(\(keysLabel ?? ""))"
        case .text: "text(hidden)"
        case .privateText: "privateText"
        case .scroll(let direction): "scroll(\(direction.rawValue))"
        }
    }

    public var debugDescription: String { description }
}

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

    public var accessibilityLabel: String { action.accessibilityLabel(name: label) }
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

    /// A button of a panel file. The file is checked more strictly than a
    /// row of My Panel: a key is lowercase, and a sequence has keys.
    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let action = try container.decode(PanelAction.self, forKey: .action)
        let keys: [Shortcut]
        switch action {
        case .shortcut(let shortcut): keys = [shortcut]
        case .sequence(let steps):
            guard !steps.isEmpty else {
                throw DecodingError.dataCorruptedError(
                    forKey: .action, in: container, debugDescription: "a sequence has no keys")
            }
            keys = steps
        case .text, .privateText, .scroll: keys = []
        }
        // A shifted key names "shift" among the modifiers.
        for case .character(let character) in keys.map(\.key) where character != character.lowercased() {
            throw PanelDecodingError.uppercaseKey(character)
        }
        self.init(
            id: try container.decode(String.self, forKey: .id),
            label: try container.decode(String.self, forKey: .label),
            symbol: try container.decodeIfPresent(String.self, forKey: .symbol),
            region: try container.decodeIfPresent(WindowRegion.self, forKey: .region),
            action: action)
    }
}

/// The JSON of an action: `{"type": "shortcut", "modifiers": ["command"],
/// "key": "s"}`. The panel files and the rows of My Panel use it. A private
/// text action has no text and no ID in its JSON, so it decodes only with the
/// ID of its button.
extension PanelAction: Codable {
    enum CodingKeys: String, CodingKey {
        case type, keys, text, direction
    }

    /// The key of `Decoder.userInfo` that holds the ID of the button.
    static let buttonID = CodingUserInfoKey(rawValue: "buttonID")!

    public init(from decoder: any Decoder) throws {
        try self.init(from: decoder, buttonID: decoder.userInfo[Self.buttonID] as? String)
    }

    init(from decoder: any Decoder, buttonID: String?) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        switch type {
        case "shortcut":
            self = .shortcut(try Shortcut(from: decoder))
        case "sequence":
            self = .sequence(try container.decode([Shortcut].self, forKey: .keys))
        case "text":
            self = .text(try container.decode(String.self, forKey: .text))
        case "privateText":
            guard let id = buttonID else {
                throw DecodingError.dataCorruptedError(
                    forKey: .type, in: container, debugDescription: "private text needs the ID of its button")
            }
            self = .privateText(id)
        case "scroll":
            let name = try container.decode(String.self, forKey: .direction)
            guard let direction = ScrollDirection(rawValue: name) else {
                throw DecodingError.dataCorruptedError(
                    forKey: .direction, in: container, debugDescription: "unknown scroll direction '\(name)'")
            }
            self = .scroll(direction)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "unknown action type '\(type)'"
            )
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .shortcut(let shortcut):
            try container.encode("shortcut", forKey: .type)
            try shortcut.encode(to: encoder)
        case .sequence(let steps):
            try container.encode("sequence", forKey: .type)
            try container.encode(steps, forKey: .keys)
        case .text(let text):
            try container.encode("text", forKey: .type)
            try container.encode(text, forKey: .text)
        case .privateText:
            try container.encode("privateText", forKey: .type)
        case .scroll(let direction):
            try container.encode("scroll", forKey: .type)
            try container.encode(direction.rawValue, forKey: .direction)
        }
    }
}

/// A shortcut in JSON: `{"modifiers": ["command"], "key": "s"}`. The
/// modifiers can be left out.
extension Shortcut: Codable {
    enum CodingKeys: String, CodingKey {
        case modifiers, key
    }

    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let names = try container.decodeIfPresent([String].self, forKey: .modifiers) ?? []
        self.init(
            modifiers: try Modifiers(names: names),
            key: try Key(name: try container.decode(String.self, forKey: .key)))
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(names.dropLast(), forKey: .modifiers)
        try container.encode(names.last, forKey: .key)
    }

    /// The names of the modifiers, then the name of the key, as JSON and
    /// `ShortcutSpec` write them.
    var names: [String] {
        let key =
            switch key {
            case .character(let character): character
            case .virtual(let virtual): String(describing: virtual)
            }
        return modifiers.heldKeys.map(\.name) + [key]
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
