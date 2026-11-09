import CoreGraphics

/// A chord of the app in front with its name, such as "New Tab" for
/// Command-T. The prediction stack shows these as suggestions when no text
/// field has focus, and when Command or Control is on.
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

/// The shortcuts that fit in the rows of the prediction stack.
///
/// Each shortcut goes into the first row that has room for it, so a long
/// shortcut that does not fit leaves room for a shorter one after it. A
/// shortcut wider than a row does not show. In each row, the shortcuts keep
/// their order.
public struct ShortcutRowsFit: Equatable, Sendable {
    /// The positions of the shortcuts in each row. Row 0 is the best row.
    public let rows: [[Int]]

    public init(widths: [CGFloat], width: CGFloat, rows count: Int, spacing: CGFloat) {
        var rows: [[Int]] = Array(repeating: [], count: max(count, 0))
        var used: [CGFloat] = Array(repeating: 0, count: rows.count)
        for (index, itemWidth) in widths.enumerated() {
            for row in rows.indices {
                let needed = (rows[row].isEmpty ? 0 : spacing) + itemWidth
                guard used[row] + needed <= width else { continue }
                rows[row].append(index)
                used[row] += needed
                break
            }
        }
        self.rows = rows.filter { !$0.isEmpty }
    }
}
