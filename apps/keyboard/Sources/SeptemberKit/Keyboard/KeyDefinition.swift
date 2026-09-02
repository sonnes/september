import CoreGraphics

/// What pressing a key does.
public enum KeyAction: Sendable, Hashable {
    /// Type a character, subject to the current shift / caps lock state.
    case character(String)
    /// Post a named key (return, arrows, F5 …).
    case virtual(VirtualKey)
    /// Latch, lock or clear a modifier.
    case modifier(Modifiers)
    /// A full combination, as used by the shortcut panels.
    case shortcut(Shortcut)
    /// Type a stored phrase verbatim.
    case text(String)
}

/// A modifier combination plus the key it applies to.
public struct Shortcut: Sendable, Hashable, Codable {
    public enum Key: Sendable, Hashable, Codable {
        case character(String)
        case virtual(VirtualKey)
    }

    public let modifiers: Modifiers
    public let key: Key

    public init(modifiers: Modifiers, key: Key) {
        self.modifiers = modifiers
        self.key = key
    }

    /// "⌘C", "⇧⌘Z", "⌘↩" — the hint drawn on shortcut buttons.
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

extension Modifiers: Codable {}

/// One key on the keyboard.
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
        self.accessibilityLabel = accessibilityLabel ?? label.capitalized
    }
}
