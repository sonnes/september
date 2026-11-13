/// A chord of the app in front with its name, such as "New Tab" for
/// Command-T. The place of the input bar shows these as suggestions when no
/// text field has focus, and when Command or Control is on.
public struct AppShortcut: Equatable, Hashable, Sendable, Identifiable {
    public let name: String
    public let shortcut: Shortcut

    public init(name: String, shortcut: Shortcut) {
        self.name = name
        self.shortcut = shortcut
    }

    public var id: Shortcut { shortcut }

    /// The name and the keys, for VoiceOver.
    public var accessibilityLabel: String { "\(name), \(shortcut.spokenName)" }

    /// The modifiers that choose the suggestions. Caps lock and fn do not.
    public static let filterModifiers: Modifiers = [.command, .control, .option, .shift]

    /// The menu items of a menu bar that have a chord and are on, in menu bar
    /// order. The Apple menu is left out, because it holds Log Out, Lock
    /// Screen, and Force Quit. The app menu, with Hide and Quit, comes last.
    /// A second item with the same chord is left out.
    public static func menu(_ menuBar: AXNode) -> [AppShortcut] {
        let menus = Array(menuBar.children.dropFirst())
        let ordered = Array(menus.dropFirst()) + menus.prefix(1)
        var shortcuts: [AppShortcut] = []
        var seen: Set<Shortcut> = []
        for menu in ordered {
            var stack = [menu]
            while let node = stack.popLast() {
                if node.isEnabled, let shortcut = node.menuKeys?.shortcut, let name = node.label,
                    seen.insert(shortcut).inserted
                {
                    shortcuts.append(AppShortcut(name: name, shortcut: shortcut))
                }
                stack.append(contentsOf: node.children.reversed())
            }
        }
        return shortcuts
    }

    /// The ID that counts the presses of this shortcut in the app with
    /// `bundleID`. It holds the bundle ID and the keys, not the name.
    public func usageID(app bundleID: String) -> String {
        "\(bundleID) \(ShortcutSpec.format([shortcut]))"
    }

    /// The menu shortcuts of the app with `bundleID`, the most pressed first.
    /// Shortcuts with the same count keep the menu bar order.
    @MainActor
    public static func ranked(_ menu: [AppShortcut], app bundleID: String, by usage: any ButtonUsage) -> [AppShortcut] {
        let uses = menu.map { usage.uses(of: $0.usageID(app: bundleID)) }
        return menu.indices
            .sorted { uses[$0] != uses[$1] ? uses[$0] > uses[$1] : $0 < $1 }
            .map { menu[$0] }
    }

    /// The suggestions from the menu shortcuts. When modifiers are on, only
    /// the chords that hold all of them stay.
    public static func suggestions(menu: [AppShortcut], modifiers: Modifiers) -> [AppShortcut] {
        let required = modifiers.intersection(filterModifiers)
        return menu.filter { $0.shortcut.modifiers.isSuperset(of: required) }
    }
}
