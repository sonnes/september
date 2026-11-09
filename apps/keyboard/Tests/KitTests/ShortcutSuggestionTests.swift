import Foundation
import SeptemberKit

@MainActor
func shortcutSuggestionTests() {
    menuListTests()
    suggestionTests()
}

private func chord(_ modifiers: Modifiers, _ key: String) -> Shortcut {
    Shortcut(modifiers: modifiers, key: .character(key))
}

private func item(
    _ id: Int, _ title: String, _ char: String? = nil, modifiers: Int = 0, enabled: Bool = true,
    children: [AXNode] = []
) -> AXNode {
    AXNode(
        id: id, role: "AXMenuItem", title: title,
        menuKeys: char.map { AXMenuKeys(character: $0, virtualKey: nil, modifiers: modifiers) },
        isEnabled: enabled, children: children)
}

private func menu(_ id: Int, _ title: String, _ items: [AXNode]) -> AXNode {
    AXNode(
        id: id, role: "AXMenuBarItem", title: title,
        children: [AXNode(id: id + 100, role: "AXMenu", children: items)])
}

/// Apple, Safari, File, and Edit, as a menu bar reads.
private let menuBar = AXNode(
    id: 0, role: "AXMenuBar",
    children: [
        menu(1, "Apple", [item(10, "Log Out", "Q", modifiers: 1)]),
        menu(2, "Safari", [item(20, "Hide Safari", "H"), item(21, "Quit Safari", "Q")]),
        menu(
            3, "File",
            [
                item(30, "New Tab", "T"),
                item(31, "Close Tab", "W", enabled: false),
                item(32, "Reopen Tab", "T", modifiers: 1),
                item(33, "No Keys"),
                item(
                    34, "More",
                    children: [AXNode(id: 35, role: "AXMenu", children: [item(36, "Deep", "9", modifiers: 4)])]),
            ]),
        menu(4, "Edit", [item(40, "Copy", "C"), item(41, "Also Copy", "C"), item(42, "Undo", "Z")]),
    ])

@MainActor
private func menuListTests() {
    test("the menu shortcuts come in menu bar order, with the app menu last") {
        let names = AppShortcut.menu(menuBar).map(\.name)
        expectEqual(names, ["New Tab", "Reopen Tab", "Deep", "Copy", "Undo", "Hide Safari", "Quit Safari"])
    }

    test("the menu shortcuts skip the Apple menu, an item that is off, and a second item with the same chord") {
        let shortcuts = AppShortcut.menu(menuBar)
        expect(!shortcuts.contains { $0.name == "Log Out" })
        expect(!shortcuts.contains { $0.name == "Close Tab" })
        expectEqual(shortcuts.first { $0.shortcut == chord(.command, "c") }?.name, "Copy")
        expectEqual(shortcuts.first { $0.name == "Deep" }?.shortcut, chord([.control, .command], "9"))
    }

    test("a shortcut has a spoken label with its name and its keys") {
        let shortcut = AppShortcut(name: "New Tab", shortcut: chord(.command, "t"))
        expectEqual(shortcut.accessibilityLabel, "New Tab, \(chord(.command, "t").spokenName)")
    }
}

@MainActor
private func suggestionTests() {
    let panel = [
        PanelButton(id: "reload", label: "Reload", symbol: nil, action: .shortcut(chord(.command, "r"))),
        PanelButton(id: "tab", label: "Fresh Tab", symbol: nil, action: .shortcut(chord(.command, "t"))),
        PanelButton(id: "hello", label: "Hello", symbol: nil, action: .text("Hello")),
        PanelButton(
            id: "twice", label: "Twice", symbol: nil,
            action: .sequence([chord([], "a"), chord([], "b")])),
        PanelButton(id: "prev", label: "Previous Tab", symbol: nil, action: .shortcut(chord([.control, .shift], "p"))),
    ]
    let menu = AppShortcut.menu(menuBar)

    test("the panel shortcuts come first, then the menu shortcuts, and each chord shows one time") {
        let names = AppShortcut.suggestions(panel: panel, menu: menu, modifiers: []).map(\.name)
        expectEqual(
            names,
            ["Reload", "Fresh Tab", "Previous Tab", "Reopen Tab", "Deep", "Copy", "Undo", "Hide Safari", "Quit Safari"])
    }

    test("the modifiers that are on keep only the shortcuts that hold all of them") {
        let command = AppShortcut.suggestions(panel: panel, menu: menu, modifiers: .command).map(\.name)
        expectEqual(command, ["Reload", "Fresh Tab", "Reopen Tab", "Deep", "Copy", "Undo", "Hide Safari", "Quit Safari"])
        let control = AppShortcut.suggestions(panel: panel, menu: menu, modifiers: .control).map(\.name)
        expectEqual(control, ["Previous Tab", "Deep"])
        let both = AppShortcut.suggestions(panel: panel, menu: menu, modifiers: [.shift, .command]).map(\.name)
        expectEqual(both, ["Reopen Tab"])
    }

    test("caps lock and fn do not filter the shortcuts") {
        let names = AppShortcut.suggestions(panel: panel, menu: [], modifiers: [.command, .capsLock, .function])
            .map(\.name)
        expectEqual(names, ["Reload", "Fresh Tab"])
    }
}
