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
    let menu = AppShortcut.menu(menuBar)

    test("with no modifier on, each menu shortcut shows") {
        let names = AppShortcut.suggestions(menu: menu, modifiers: []).map(\.name)
        expectEqual(names, ["New Tab", "Reopen Tab", "Deep", "Copy", "Undo", "Hide Safari", "Quit Safari"])
    }

    test("the modifiers that are on keep only the shortcuts that hold all of them") {
        let control = AppShortcut.suggestions(menu: menu, modifiers: .control).map(\.name)
        expectEqual(control, ["Deep"])
        let both = AppShortcut.suggestions(menu: menu, modifiers: [.shift, .command]).map(\.name)
        expectEqual(both, ["Reopen Tab"])
    }

    test("caps lock and fn do not filter the shortcuts") {
        let names = AppShortcut.suggestions(menu: menu, modifiers: [.control, .capsLock, .function]).map(\.name)
        expectEqual(names, ["Deep"])
    }
}
