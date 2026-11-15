import CoreGraphics

public enum KeyAction: Sendable, Hashable {
    /// Type a character, subject to the current shift / caps lock state.
    case character(String)
    case virtual(VirtualKey)
    /// Latch, lock or clear a modifier.
    case modifier(Modifiers)
    /// An F-key by its number. It posts its media key. While a modifier
    /// other than caps lock is on, it posts the F-key with the modifiers.
    case function(Int)
    /// A key that controls the Mac. It acts in Type and Talk mode.
    case system(SystemKey)
}

/// A key that presses a fixed shortcut of macOS. The shortcuts of macOS
/// match the key code, not the character, so the key codes are fixed too.
public enum SystemKey: Sendable, Hashable {
    /// Shift-Command-4: the crosshair of a screenshot.
    case screenshot
    /// Control-Command-Q: locks the Mac.
    case lockScreen

    /// The ANSI key code of the key of the shortcut.
    public var virtualKey: UInt16 {
        switch self {
        case .screenshot: 21
        case .lockScreen: 12
        }
    }

    public var modifiers: Modifiers {
        switch self {
        case .screenshot: [.shift, .command]
        case .lockScreen: [.control, .command]
        }
    }

    public var spokenName: String {
        switch self {
        case .screenshot: "Screenshot"
        case .lockScreen: "Lock Screen"
        }
    }

    public var symbolName: String {
        switch self {
        case .screenshot: "camera.viewfinder"
        case .lockScreen: "lock"
        }
    }
}

public struct Shortcut: Sendable, Hashable {
    public enum Key: Sendable, Hashable {
        case character(String)
        case virtual(VirtualKey)
    }

    public let modifiers: Modifiers
    public let key: Key

    public init(modifiers: Modifiers, key: Key) {
        self.modifiers = modifiers
        self.key = key
    }

    /// "⌘C", "⇧⌘Z", "⌘↩": the hint drawn on shortcut buttons.
    public var display: String {
        let keyPart: String
        switch key {
        case .character(let character): keyPart = character.uppercased()
        case .virtual(let virtual): keyPart = virtual.symbol ?? virtual.spokenName
        }
        return modifiers.symbols + keyPart
    }

    public var spokenName: String {
        let keyPart: String
        switch key {
        case .character(let character): keyPart = character.uppercased()
        case .virtual(let virtual): keyPart = virtual.spokenName
        }
        let modifierPart = modifiers.spokenName
        return modifierPart.isEmpty ? keyPart : "\(modifierPart) \(keyPart)"
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

public struct KeyDefinition: Sendable, Hashable, Identifiable {
    public let id: String
    public let kind: KeyKind
    public let label: String
    /// The shifted symbol printed above the label on number-row keys.
    public let secondaryLabel: String?
    /// Share of the row's width. 1 is a standard key.
    public let weight: CGFloat
    public let action: KeyAction
    public let accessibilityLabel: String

    /// True when the key acts on the button up, so that the user can slide
    /// off the key to cancel it. Only Lock Screen does this, because a press
    /// by mistake locks the Mac.
    public var actsOnRelease: Bool { action == .system(.lockScreen) }

    public init(
        id: String,
        kind: KeyKind,
        label: String,
        secondaryLabel: String? = nil,
        weight: CGFloat = 1,
        action: KeyAction,
        accessibilityLabel: String? = nil
    ) {
        self.id = id
        self.kind = kind
        self.label = label
        self.secondaryLabel = secondaryLabel
        self.weight = weight
        self.action = action
        self.accessibilityLabel = accessibilityLabel
            ?? Self.spokenName(of: action, label: label, secondaryLabel: secondaryLabel)
    }

    /// The name of the key the action posts, or the label for caps lock and
    /// a character. A key with a shifted symbol also names that symbol:
    /// "1, shift for !".
    private static func spokenName(
        of action: KeyAction, label: String, secondaryLabel: String?
    ) -> String {
        let name = spokenName(of: action, label: label)
        return secondaryLabel.map { "\(name), shift for \($0)" } ?? name
    }

    private static func spokenName(of action: KeyAction, label: String) -> String {
        switch action {
        case .virtual(let virtual): virtual.spokenName
        case .function(let number): VirtualKey.function(number)?.spokenName ?? label
        case .system(let system): system.spokenName
        case .modifier(let modifier) where !modifier.spokenName.isEmpty: modifier.spokenName
        case .modifier, .character: label.capitalized
        }
    }
}
