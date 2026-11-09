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

    /// The suggestions: the chords of the app panel in their order, then the
    /// menu shortcuts. A chord shows one time, with the name of the panel. When
    /// modifiers are on, only the chords that hold all of them stay.
    public static func suggestions(
        panel: [PanelButton], menu: [AppShortcut], modifiers: Modifiers
    ) -> [AppShortcut] {
        let required = modifiers.intersection(filterModifiers)
        let fromPanel = panel.compactMap { button -> AppShortcut? in
            guard case .shortcut(let shortcut) = button.action else { return nil }
            return AppShortcut(name: button.label, shortcut: shortcut)
        }
        var seen: Set<Shortcut> = []
        return (fromPanel + menu).filter {
            $0.shortcut.modifiers.isSuperset(of: required) && seen.insert($0.shortcut).inserted
        }
    }
}
