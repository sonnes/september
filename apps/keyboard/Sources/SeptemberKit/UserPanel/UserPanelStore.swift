import Combine
import Foundation

/// The buttons of My Panel, saved as JSON in
/// `~/Library/Application Support/September Keyboard/my-panel.json`.
///
/// The file holds only the name of a private text button. Its text is in the
/// `PrivateTextStore`, under the ID of the button.
@MainActor
public final class UserPanelStore: ObservableObject {
    /// The buttons in the order of the settings. `ranked(by:)` gives the
    /// order of the panel.
    @Published public private(set) var buttons: [UserButton]
    /// New text goes to the Keychain when this is on.
    @Published public var makeNewTextPrivate: Bool {
        // A failed save leaves the switch on the screen as the user set it;
        // the next change saves again.
        didSet { try? save() }
    }

    public let fileURL: URL
    private let privateTexts: any PrivateTextStore

    public static var defaultFileURL: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("September Keyboard", isDirectory: true)
            .appendingPathComponent("my-panel.json")
    }

    /// Loads the panel. A missing file gives an empty panel. A broken file
    /// throws and stays as it is, so that no save overwrites the buttons of
    /// the user.
    public init(
        fileURL: URL = UserPanelStore.defaultFileURL,
        privateTexts: any PrivateTextStore = KeychainPrivateTextStore()
    ) throws {
        self.fileURL = fileURL
        self.privateTexts = privateTexts
        if FileManager.default.fileExists(atPath: fileURL.path) {
            let saved = try JSONDecoder().decode(SavedPanel.self, from: Data(contentsOf: fileURL))
            buttons = saved.buttons
            makeNewTextPrivate = saved.makeNewTextPrivate
        } else {
            buttons = []
            makeNewTextPrivate = true
        }
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
        buttons.append(made)
        try save()
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
        buttons += added
        try save()
        return added.count
    }

    public func remove(id: String) throws {
        guard let index = buttons.firstIndex(where: { $0.id == id }) else { return }
        if buttons[index].action == .privateText {
            try privateTexts.removeText(for: id)
        }
        buttons.remove(at: index)
        try save()
    }

    /// Moves the text of a text button into the Keychain, or back out of it.
    public func setPrivate(_ isPrivate: Bool, for id: String) throws {
        guard let index = buttons.firstIndex(where: { $0.id == id }) else { return }
        switch (buttons[index].action, isPrivate) {
        case (.text(let text), true):
            try privateTexts.setText(text, for: id)
            buttons[index].action = .privateText
            try save()
        case (.privateText, false):
            let text = try privateTexts.text(for: id) ?? ""
            buttons[index].action = .text(text)
            try save()
            try privateTexts.removeText(for: id)
        default:
            break
        }
    }

    // MARK: - Saving

    private func make(_ button: NewButton, textAsPrivate: Bool) throws -> UserButton {
        let id = UUID().uuidString
        let action: UserAction
        switch button.action {
        case .shortcut(let shortcut): action = .shortcut(shortcut)
        case .sequence(let keys): action = .sequence(keys)
        case .text(let text) where textAsPrivate:
            try privateTexts.setText(text, for: id)
            action = .privateText
        case .text(let text): action = .text(text)
        }
        return UserButton(id: id, name: button.name, action: action)
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

    private func save() throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(
            SavedPanel(makeNewTextPrivate: makeNewTextPrivate, buttons: buttons))
        try FileManager.default.createDirectory(
            at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: fileURL, options: .atomic)
    }
}

private struct SavedPanel: Codable {
    var makeNewTextPrivate: Bool
    var buttons: [UserButton]
}
