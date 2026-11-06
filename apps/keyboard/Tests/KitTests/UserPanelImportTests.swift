import Foundation
import SeptemberKit

// Fixture panels for the Accessibility Keyboard importer. They are written by
// hand from the format of the panels that ship with macOS. None of them comes
// from the panels of a user.

private let shift = 1 << 17
private let control = 1 << 18
private let option = 1 << 19
private let command = 1 << 20
private let fn = 1 << 23

private func macKey(_ code: Int, _ modifiers: Int = 0) -> [String: Any] {
    var param: [String: Any] = [
        "KeyboardHWID": 0, "MacKeyCode": code, "UsesMacKeyCode": true,
        "shouldNotLockModifier": false,
    ]
    if modifiers != 0 { param["Modifiers"] = modifiers }
    return ["ActionType": "ActionPressKeyCode", "ActionParam": param, "ID": "Action.\(UUID())"]
}

private func usbKey(_ usage: Int, _ modifiers: Int = 0) -> [String: Any] {
    var param: [String: Any] = [
        "KeyboardHWID": 0, "USBKeyCode": 0x07_0000 | usage, "UsesMacKeyCode": false,
        "shouldNotLockModifier": false,
    ]
    if modifiers != 0 { param["Modifiers"] = modifiers }
    return ["ActionType": "ActionPressKeyCode", "ActionParam": param]
}

private func chars(_ text: String) -> [String: Any] {
    ["ActionType": "ActionPressKeyCharSequence", "ActionParam": ["CharString": text, "isStickyKey": false]]
}

private func macro(_ events: [[String: Any]]) -> [String: Any] {
    ["ActionType": "ActionPerformKeyMacro", "ActionParam": ["Events": events, "isStickyKey": false]]
}

private func object(_ text: String, _ actions: [[String: Any]]) -> [String: Any] {
    [
        "PanelObjectType": "Button", "ID": "Button.\(UUID())", "DisplayText": text,
        "Rect": "{{0, 0}, {65, 50}}", "Actions": actions,
    ]
}

private func group(_ objects: [[String: Any]]) -> [String: Any] {
    ["PanelObjectType": "Group", "ID": "Group.\(UUID())", "PanelObjects": objects]
}

private func writeBundle(
    _ name: String, in directory: URL, displayName: String, panels: [String: [String: Any]]
) throws {
    let contents = directory.appendingPathComponent("\(name).ascconfig/Contents")
    let resources = contents.appendingPathComponent("Resources")
    try FileManager.default.createDirectory(at: resources, withIntermediateDirectories: true)
    try PropertyListSerialization.data(
        fromPropertyList: ["ASCConfigurationDisplayName": displayName], format: .xml, options: 0
    ).write(to: contents.appendingPathComponent("Info.plist"))
    try PropertyListSerialization.data(
        fromPropertyList: ["Panels": panels], format: .binary, options: 0
    ).write(to: resources.appendingPathComponent("PanelDefinitions.plist"))
}

/// A stub layout: the Mac key codes that the fixtures press.
private let stubLayout: KeyLayoutProbe = { code, modifiers in
    let table: [UInt16: String] = [0: "a", 1: "s", 8: "c", 9: "v", 12: "q", 34: "i", 35: "p", 45: "n"]
    guard let plain = table[code] else { return nil }
    return modifiers.contains(.shift) ? plain.uppercased() : plain
}

private func fixtureDirectory() throws -> URL {
    let directory = temporaryDirectory()
    let returnKey = 36
    try writeBundle(
        "Keyboard - ANSI", in: directory, displayName: "Panels",
        panels: [
            "USER.8F2C": [
                "ID": "USER.8F2C", "Name": "Keyboard - ANSI",
                "PanelObjects": [
                    object("q", [macKey(12)]),
                    object("Q", [macKey(12, shift)]),
                    object("up", [usbKey(0x52, fn)]),
                    object("Paste as Text", [macKey(9, shift | command)]),
                    object("Word Left", [usbKey(0x50, option | fn)]),
                    object("Exit", [macro([macKey(8, control), macKey(8, control)])]),
                    object("Rewind", [macro([macKey(53), macKey(53)])]),
                    object("Home Address", [chars("1 Main Street")]),
                    object("a", [chars("a")]),
                    object("", [macKey(1, command)]),
                    object("hunter2", [chars("hunter2")]),
                    object("PIN", [macro([macKey(35), macKey(34), macKey(45), macKey(returnKey)])]),
                    object("More", [["ActionType": "ActionOpenPanel", "ActionParam": ["PanelID": "x"]]]),
                    object("", [["ActionType": "ActionPlaceholder", "ActionParam": [:]]]),
                    group([object("Save", [macKey(1, command)])]),
                ],
            ],
            "ACSH.systemPanel.kb.ANSI.small": [
                "ID": "ACSH.systemPanel.kb.ANSI.small", "Name": "Standard",
                "PanelObjects": [object("Copy", [macKey(8, command)])],
            ],
        ])
    try writeBundle(
        "Code", in: directory, displayName: "Code",
        panels: [
            "USER.11AA": [
                "ID": "USER.11AA",
                "PanelObjects": [object("Start", [chars("claude")]), object("Clear", [chars("/clear")])],
            ]
        ])
    return directory
}

private func panel(_ panels: [ImportedPanel], _ name: String) -> ImportedPanel? {
    panels.first { $0.name == name }
}

private func names(_ panel: ImportedPanel?) -> [String] { panel?.buttons.map(\.name) ?? [] }

@MainActor
func importerTests() {
    test("the importer reads the panels of the user, not the system panels") {
        let panels = try AccessibilityKeyboardImporter(
            directory: try fixtureDirectory(), layout: stubLayout
        ).panels()
        expectEqual(panels.map(\.name).sorted(), ["Code", "Keyboard - ANSI"])
    }

    test("the importer makes keys, sequences, and text, and skips the standard keys") {
        let panels = try AccessibilityKeyboardImporter(
            directory: try fixtureDirectory(), layout: stubLayout
        ).panels()
        let keyboard = panel(panels, "Keyboard - ANSI")
        let actions = keyboard?.buttons.map(\.action) ?? []

        expect(actions.contains(.shortcut(Shortcut(modifiers: [.shift, .command], key: .character("v")))))
        expect(actions.contains(.shortcut(Shortcut(modifiers: .option, key: .virtual(.left)))))
        let interrupt = Shortcut(modifiers: .control, key: .character("c"))
        expect(actions.contains(.sequence([interrupt, interrupt])))
        let escape = Shortcut(modifiers: [], key: .virtual(.escape))
        expect(actions.contains(.sequence([escape, escape])))
        expect(actions.contains(.text("1 Main Street")))
        expect(actions.contains(.text("hunter2")))
        expect(actions.contains(.text("pin\n")), "a macro of plain keys types text")
        expect(actions.contains(.shortcut(Shortcut(modifiers: .command, key: .character("s")))))

        for skipped in ["q", "Q", "up", "a", "More"] {
            expect(!names(keyboard).contains(skipped), "\(skipped) was imported")
        }
        expectEqual(keyboard?.buttons.count, 9)
        expectEqual(keyboard?.keyCount, 4)
        expectEqual(keyboard?.sequenceCount, 2)
        expectEqual(keyboard?.textCount, 3)
    }

    test("a button with no name takes the name of its keys") {
        let panels = try AccessibilityKeyboardImporter(
            directory: try fixtureDirectory(), layout: stubLayout
        ).panels()
        expect(names(panel(panels, "Keyboard - ANSI")).contains("⌘S"))
    }

    test("a text button whose name is its text does not keep the text as its name") {
        let panels = try AccessibilityKeyboardImporter(
            directory: try fixtureDirectory(), layout: stubLayout
        ).panels()
        let keyboard = panel(panels, "Keyboard - ANSI")
        let named = keyboard?.buttons.first { $0.action == .text("hunter2") }
        expect(named != nil)
        expect(named?.name != "hunter2", "the name shows the private text")
    }

    test("a panel with no name takes the name of its bundle") {
        let panels = try AccessibilityKeyboardImporter(
            directory: try fixtureDirectory(), layout: stubLayout
        ).panels()
        expectEqual(names(panel(panels, "Code")), ["Start", "Clear"])
        expectEqual(panel(panels, "Code")?.textCount, 2)
    }

    test("the system probe names the keys that the system key map types") {
        let probe = SystemKeyboardLayout.currentProbe()
        let map = SystemKeyboardLayout.currentMap()
        var named = 0
        for code in UInt16(0)..<128 {
            guard let character = probe(code, []) else { continue }
            named += 1
            expect(map.keystroke(for: character) != nil, "key \(code) has no way back")
        }
        expect(named > 0, "the probe names no key")
    }

    test("a missing folder gives no panels") {
        let panels = try AccessibilityKeyboardImporter(
            directory: temporaryDirectory(), layout: stubLayout
        ).panels()
        expect(panels.isEmpty)
    }

    test("a broken bundle is skipped and the others still import") {
        let directory = try fixtureDirectory()
        let broken = directory.appendingPathComponent("Broken.ascconfig/Contents/Resources")
        try FileManager.default.createDirectory(at: broken, withIntermediateDirectories: true)
        try Data("not a plist".utf8).write(to: broken.appendingPathComponent("PanelDefinitions.plist"))
        let panels = try AccessibilityKeyboardImporter(directory: directory, layout: stubLayout).panels()
        expectEqual(panels.count, 2)
    }

    test("the import choice counts the buttons of the chosen panels") {
        let panels = try AccessibilityKeyboardImporter(
            directory: try fixtureDirectory(), layout: stubLayout
        ).panels()
        let choice = ImportChoice(panels: panels)
        expectEqual(choice.buttonCount, 11)
        expectEqual(choice.textCount, 5)
        expect(choice.textAsPrivate, "text must come in as private by default")

        choice.toggle(panel(panels, "Code")!.id)
        expectEqual(choice.buttonCount, 9)
        expectEqual(choice.textCount, 3)
        expectEqual(choice.chosenButtons.count, 9)
    }
}
