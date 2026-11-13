import Foundation

/// One button of My Panel. A text action holds text that the `user_button`
/// table holds. A private text action holds the ID of the button, and the
/// Keychain holds its text.
public struct UserButton: Sendable, Hashable, Identifiable {
    public let id: String
    public var name: String
    public var action: PanelAction

    public init(id: String, name: String, action: PanelAction) {
        self.id = id
        self.name = name
        self.action = action
    }

    /// The full name. It never holds the text of a private button.
    public var accessibilityLabel: String { action.accessibilityLabel(name: name) }
}

/// A button to add to My Panel, from the settings or from an import. The
/// store decides where the text of a text action goes.
public struct NewButton: Sendable, Hashable {
    public var name: String
    public var action: PanelAction

    public init(name: String, action: PanelAction) {
        self.name = name
        self.action = action
    }
}

// MARK: - JSON

extension UserButton: Codable {
    enum CodingKeys: String, CodingKey {
        case id, name, action
    }

    /// A button in JSON: `{"id": …, "name": …, "action": {…}}`. The action
    /// of a private button takes the ID of the button.
    public init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let id = try container.decode(String.self, forKey: .id)
        self.init(
            id: id,
            name: try container.decode(String.self, forKey: .name),
            action: try PanelAction(from: container.superDecoder(forKey: .action), buttonID: id))
    }
}
