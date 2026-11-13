import CoreGraphics
import Foundation

/// What the keyboard layout of the user types for a Mac key code with the
/// given modifiers, or `nil`. The app passes the `UCKeyTranslate` probe of
/// `SystemKeyboardLayout`, and the tests pass a table.
public typealias KeyLayoutProbe = @Sendable (UInt16, Modifiers) -> String?

/// One panel of the Accessibility Keyboard, with the buttons that the user
/// made.
public struct ImportedPanel: Sendable, Hashable, Identifiable {
    public let id: String
    public let name: String
    public let buttons: [NewButton]

    public var keyCount: Int { count { if case .shortcut = $0 { true } else { false } } }
    public var sequenceCount: Int { count { if case .sequence = $0 { true } else { false } } }
    public var textCount: Int { count { if case .text = $0 { true } else { false } } }

    /// "45 of your buttons: 31 keys, 2 sequences, 12 text", or "21 text
    /// buttons" for a panel of text only.
    public var summary: String {
        if textCount == buttons.count {
            return "\(textCount) text \(textCount == 1 ? "button" : "buttons")"
        }
        let parts = [
            keyCount > 0 ? "\(keyCount) \(keyCount == 1 ? "key" : "keys")" : nil,
            sequenceCount > 0
                ? "\(sequenceCount) \(sequenceCount == 1 ? "sequence" : "sequences")" : nil,
            textCount > 0 ? "\(textCount) text" : nil,
        ]
        return "\(buttons.count) of your buttons: "
            + parts.compactMap { $0 }.joined(separator: ", ")
    }

    private func count(_ matches: (NewButtonAction) -> Bool) -> Int {
        buttons.filter { matches($0.action) }.count
    }
}

/// Reads the panels that the user made in the Accessibility Keyboard of
/// macOS: each `.ascconfig` bundle in
/// `~/Library/Application Support/com.apple.AssistiveControl/`.
///
/// Each bundle has `Contents/Resources/PanelDefinitions.plist`. The importer
/// makes keys from `ActionPressKeyCode`, sequences from
/// `ActionPerformKeyMacro`, and text from `ActionPressKeyCharSequence`. It
/// skips the system panels and the standard keys, which the keyboard already
/// has. These panels often hold passwords as plain text, so nothing here logs
/// or prints a value.
public struct AccessibilityKeyboardImporter: Sendable {
    public static var defaultDirectory: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("com.apple.AssistiveControl", isDirectory: true)
    }

    private let directory: URL
    private let layout: KeyLayoutProbe

    public init(directory: URL = defaultDirectory, layout: @escaping KeyLayoutProbe) {
        self.directory = directory
        self.layout = layout
    }

    /// The panels that have buttons to import, by name. A bundle that does not
    /// read is skipped. A missing folder gives no panels.
    public func panels() throws -> [ImportedPanel] {
        guard FileManager.default.fileExists(atPath: directory.path) else { return [] }
        guard
            let walker = FileManager.default.enumerator(
                at: directory, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles])
        else { return [] }

        var panels: [ImportedPanel] = []
        while let url = walker.nextObject() as? URL {
            guard url.pathExtension == "ascconfig" else { continue }
            walker.skipDescendants()
            panels += (try? read(bundle: url)) ?? []
        }
        return panels.sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
    }

    // MARK: - Bundles and panels

    private func read(bundle: URL) throws -> [ImportedPanel] {
        let contents = bundle.appendingPathComponent("Contents")
        let definitions = try plist(
            contents.appendingPathComponent("Resources/PanelDefinitions.plist"))
        let info = try? plist(contents.appendingPathComponent("Info.plist"))
        let bundleName =
            nonEmpty(info?["ASCConfigurationDisplayName"] as? String)
            ?? bundle.deletingPathExtension().lastPathComponent

        let byID = definitions["Panels"] as? [String: Any] ?? [:]
        return byID.keys.sorted().compactMap { key in
            guard !key.hasPrefix("ACSH."), let panel = byID[key] as? [String: Any] else {
                return nil
            }
            let buttons = buttons(in: panel["PanelObjects"] as? [[String: Any]] ?? [])
            guard !buttons.isEmpty else { return nil }
            return ImportedPanel(
                id: "\(bundle.lastPathComponent)/\(key)",
                name: nonEmpty(panel["Name"] as? String) ?? bundleName,
                buttons: buttons)
        }
    }

    private func plist(_ url: URL) throws -> [String: Any] {
        let value = try PropertyListSerialization.propertyList(
            from: Data(contentsOf: url), options: [], format: nil)
        guard let dictionary = value as? [String: Any] else {
            throw CocoaError(.propertyListReadCorrupt)
        }
        return dictionary
    }

    /// The buttons of a panel and of its groups, in order.
    private func buttons(in objects: [[String: Any]]) -> [NewButton] {
        var result: [NewButton] = []
        var unnamedText = 0
        func walk(_ objects: [[String: Any]]) {
            for object in objects {
                if let children = object["PanelObjects"] as? [[String: Any]] {
                    walk(children)
                }
                guard let actions = object["Actions"] as? [[String: Any]],
                    let action = action(for: actions)
                else { continue }
                let label = nonEmpty(object["DisplayText"] as? String)
                result.append(NewButton(name: name(label, for: action, unnamedText: &unnamedText), action: action))
            }
        }
        walk(objects)
        return result
    }

    /// The name of a button. A text button whose label is its own text gets a
    /// plain name, because the name shows on screen and the text can be a
    /// password.
    private func name(_ label: String?, for action: NewButtonAction, unnamedText: inout Int) -> String {
        switch action {
        case .shortcut(let shortcut):
            return label ?? shortcut.display
        case .sequence(let keys):
            return label ?? keys.map(\.display).joined(separator: " ")
        case .text(let text):
            if let label, label.caseInsensitiveCompare(text.trimmingCharacters(in: .whitespacesAndNewlines)) != .orderedSame {
                return label
            }
            unnamedText += 1
            return "Text \(unnamedText)"
        }
    }

    // MARK: - Actions

    private func action(for actions: [[String: Any]]) -> NewButtonAction? {
        if actions.count == 1 {
            let only = actions[0]
            let param = only["ActionParam"] as? [String: Any] ?? [:]
            switch only["ActionType"] as? String {
            case "ActionPressKeyCharSequence":
                return text(param["CharString"] as? String)
            case "ActionPerformKeyMacro":
                return keys(param["Events"] as? [[String: Any]] ?? [])
            case "ActionPressKeyCode":
                return keys(actions)
            default:
                return nil
            }
        }
        // A button with more than one action presses them in order.
        return keys(actions)
    }

    /// Text, or `nil` for the one-letter text of a standard key.
    private func text(_ text: String?) -> NewButtonAction? {
        guard let text, !text.isEmpty else { return nil }
        if text.count == 1, text.allSatisfy({ $0.isASCII }) { return nil }
        return .text(text)
    }

    /// Keys from a list of `ActionPressKeyCode` actions: one shortcut, a
    /// sequence, or text when the keys only type characters.
    private func keys(_ events: [[String: Any]]) -> NewButtonAction? {
        var pressed: [PressedKey] = []
        for event in events {
            guard event["ActionType"] as? String == "ActionPressKeyCode",
                let key = pressedKey(event["ActionParam"] as? [String: Any] ?? [:])
            else { return nil }
            pressed.append(key)
        }
        guard let first = pressed.first else { return nil }

        if pressed.count == 1 {
            return first.isChord ? .shortcut(first.shortcut) : nil
        }
        if let typed = typedText(pressed) { return .text(typed) }
        return .sequence(pressed.map(\.shortcut))
    }

    /// The text that a list of plain keys types, or `nil` when the list holds
    /// a chord or no character at all. A recorded password is such a list.
    private func typedText(_ pressed: [PressedKey]) -> String? {
        guard pressed.allSatisfy({ !$0.isChord }),
            pressed.contains(where: { if case .character = $0.shortcut.key { true } else { false } })
        else { return nil }

        var text = ""
        for key in pressed {
            switch key.shortcut.key {
            case .character:
                guard let typed = layout(key.code, key.shortcut.modifiers.intersection(.shift))
                else { return nil }
                text += typed
            case .virtual(.return): text += "\n"
            case .virtual(.tab): text += "\t"
            case .virtual(.space): text += " "
            case .virtual: return nil
            }
        }
        return text
    }

    private func pressedKey(_ param: [String: Any]) -> PressedKey? {
        let usesMac = param["UsesMacKeyCode"] as? Bool ?? (param["MacKeyCode"] != nil)
        let code: UInt16?
        if usesMac {
            code = (param["MacKeyCode"] as? Int).flatMap { UInt16(exactly: $0) }
        } else {
            code = (param["USBKeyCode"] as? Int).flatMap(HIDKeyCodes.macKeyCode(forUSB:))
        }
        guard let code, !Self.modifierKeyCodes.contains(code) else { return nil }

        var modifiers = Modifiers(
            eventFlags: CGEventFlags(rawValue: UInt64(truncatingIfNeeded: param["Modifiers"] as? Int ?? 0)))
        let key: Shortcut.Key
        if let virtual = VirtualKey(rawValue: code) {
            key = .virtual(virtual)
            // macOS sets fn on the arrows, the F keys, and the keys above the
            // arrows. It is part of the key, not a chord.
            if Self.functionKeys.contains(virtual) { modifiers.remove(.function) }
        } else if let character = layout(code, []) {
            key = .character(character)
        } else {
            return nil
        }
        return PressedKey(code: code, shortcut: Shortcut(modifiers: modifiers, key: key))
    }

    /// Command, shift, caps lock, option, control, and fn, left and right.
    private static let modifierKeyCodes: Set<UInt16> = [54, 55, 56, 57, 58, 59, 60, 61, 62, 63]

    private static let functionKeys: Set<VirtualKey> = [
        .left, .right, .up, .down, .home, .end, .pageUp, .pageDown, .forwardDelete,
        .f1, .f2, .f3, .f4, .f5, .f6, .f7, .f8, .f9, .f10, .f11, .f12,
    ]
}

private struct PressedKey {
    let code: UInt16
    let shortcut: Shortcut

    /// A chord holds control, option, or command, or fn on a character. A
    /// plain or shifted key is a standard key of the keyboard.
    var isChord: Bool {
        if !shortcut.modifiers.isDisjoint(with: [.control, .option, .command]) { return true }
        if case .character = shortcut.key { return shortcut.modifiers.contains(.function) }
        return false
    }
}

private func nonEmpty(_ text: String?) -> String? {
    guard let text = text?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty
    else { return nil }
    return text
}
