import Combine
import Foundation

/// The buttons of My Panel, in the `user_button` table of `keyboard.sqlite`.
///
/// The table holds only the name of a private text button. Its text is in the
/// `PrivateTextStore`, under the ID of the button. The switch for new private
/// text is in `UserDefaults`.
@MainActor
public final class UserPanelStore: ObservableObject {
    /// The buttons in the order of the settings. `ranked(by:)` gives the
    /// order of the panel.
    @Published public private(set) var buttons: [UserButton]
    /// New text goes to the Keychain when this is on.
    @Published public var makeNewTextPrivate: Bool {
        didSet { defaults.set(makeNewTextPrivate, forKey: Self.makeNewTextPrivateKey) }
    }

    /// The `UserDefaults` key of `makeNewTextPrivate`.
    public static let makeNewTextPrivateKey = "myPanel.makeNewTextPrivate"

    private let database: KeyboardDatabase
    private let defaults: UserDefaults
    private let privateTexts: any PrivateTextStore

    /// Opens the panel on `database`. A row that does not decode throws, and
    /// the table stays as it is.
    public init(
        database: KeyboardDatabase,
        defaults: UserDefaults = .standard,
        privateTexts: any PrivateTextStore = KeychainPrivateTextStore()
    ) throws {
        self.database = database
        self.defaults = defaults
        self.privateTexts = privateTexts
        buttons = try Self.load(from: database)
        makeNewTextPrivate = defaults.object(forKey: Self.makeNewTextPrivateKey) as? Bool ?? true
    }

    // MARK: - Order

    /// The buttons, most used first. A tie keeps the order of the settings.
    /// The caller decides when to rank again, so that a button never moves
    /// while the user aims at it.
    public func ranked(by usage: any ButtonUsage) -> [UserButton] {
        buttons.enumerated()
            .sorted { lhs, rhs in
                let left = usage.uses(of: lhs.element.id)
                let right = usage.uses(of: rhs.element.id)
                return left != right ? left > right : lhs.offset < rhs.offset
            }
            .map(\.element)
    }

    // MARK: - Changes

    /// Adds a button at the end and gives its ID. New text goes to the
    /// Keychain if `makeNewTextPrivate` is on.
    @discardableResult
    public func add(_ button: NewButton) throws -> String {
        let made = try make(button, textAsPrivate: makeNewTextPrivate)
        try insert([made])
        buttons.append(made)
        return made.id
    }

    /// Adds the imported buttons that the panel does not have yet, and gives
    /// the number added.
    @discardableResult
    public func importButtons(_ imported: [NewButton], textAsPrivate: Bool) throws -> Int {
        var added: [UserButton] = []
        for button in imported where !contains(button, among: buttons + added) {
            added.append(try make(button, textAsPrivate: textAsPrivate))
        }
        try insert(added)
        buttons += added
        return added.count
    }

    public func remove(id: String) throws {
        guard let index = buttons.firstIndex(where: { $0.id == id }) else { return }
        if case .privateText = buttons[index].action {
            try privateTexts.removeText(for: id)
        }
        try database.execute("DELETE FROM user_button WHERE id = ?", [.text(id)])
        buttons.remove(at: index)
    }

    /// Moves the text of a text button into the Keychain, or back out of it.
    public func setPrivate(_ isPrivate: Bool, for id: String) throws {
        guard let index = buttons.firstIndex(where: { $0.id == id }) else { return }
        switch (buttons[index].action, isPrivate) {
        case (.text(let text), true):
            try privateTexts.setText(text, for: id)
            try update(.privateText(id), of: id)
            buttons[index].action = .privateText(id)
        case (.privateText, false):
            let text = try privateTexts.text(for: id) ?? ""
            try update(.text(text), of: id)
            buttons[index].action = .text(text)
            try privateTexts.removeText(for: id)
        default:
            break
        }
    }

    // MARK: - Saving

    private func make(_ button: NewButton, textAsPrivate: Bool) throws -> UserButton {
        let id = UUID().uuidString
        guard textAsPrivate, case .text(let text) = button.action else {
            return UserButton(id: id, name: button.name, action: button.action)
        }
        try privateTexts.setText(text, for: id)
        return UserButton(id: id, name: button.name, action: .privateText(id))
    }

    /// Keys are the same button when they press the same keys. Text is the
    /// same button when it has the same name, because the text of a private
    /// button stays in the Keychain.
    private func contains(_ button: NewButton, among existing: [UserButton]) -> Bool {
        existing.contains { other in
            switch (button.action, other.action) {
            case (.shortcut(let new), .shortcut(let old)): new == old
            case (.sequence(let new), .sequence(let old)): new == old
            case (.text(let new), .text(let old)): new == old || button.name == other.name
            case (.text, .privateText): button.name == other.name
            default: false
            }
        }
    }

    /// Adds rows after the last position, in one transaction.
    private func insert(_ added: [UserButton]) throws {
        guard !added.isEmpty else { return }
        try database.transaction {
            let last = try database.query("SELECT max(position) FROM user_button").first?.first?.int ?? -1
            for (offset, button) in added.enumerated() {
                try database.execute(
                    "INSERT INTO user_button (id, position, name, action) VALUES (?, ?, ?, ?)",
                    [
                        .text(button.id), .int(last + 1 + Int64(offset)), .text(button.name),
                        .text(try Self.json(button.action)),
                    ])
            }
        }
    }

    private func update(_ action: PanelAction, of id: String) throws {
        try database.execute(
            "UPDATE user_button SET action = ? WHERE id = ?", [.text(try Self.json(action)), .text(id)])
    }

    private static func load(from database: KeyboardDatabase) throws -> [UserButton] {
        try database.query("SELECT id, name, action FROM user_button ORDER BY position").map { row in
            guard let id = row[0].text, let name = row[1].text, let action = row[2].text else {
                throw DatabaseError.mismatch("a user_button row has no text")
            }
            let decoder = JSONDecoder()
            decoder.userInfo[PanelAction.buttonID] = id
            return UserButton(id: id, name: name, action: try decoder.decode(PanelAction.self, from: Data(action.utf8)))
        }
    }

    /// The JSON text of `action` in the `action` column.
    static func json(_ action: PanelAction) throws -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        return String(decoding: try encoder.encode(action), as: UTF8.self)
    }
}
