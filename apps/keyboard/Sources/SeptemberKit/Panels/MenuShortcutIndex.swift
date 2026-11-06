/// The names of the chords in the menu bar of an app, such as "Downloads" for
/// Option-Command-L in Safari. `ShortcutLearner` names a learned chord with it.
public struct MenuShortcutIndex: Sendable {
    private let names: [Shortcut: String]

    /// Builds the index from the menu bar of an app. The first menu item with
    /// a chord gives the name of that chord.
    public init(menuBar: AXNode) {
        var names: [Shortcut: String] = [:]
        var stack = [menuBar]
        while let node = stack.popLast() {
            if let shortcut = node.menuKeys?.shortcut, let label = node.subtitle,
                names[shortcut] == nil
            {
                names[shortcut] = label
            }
            stack.append(contentsOf: node.children.reversed())
        }
        self.names = names
    }

    public func name(for shortcut: Shortcut) -> String? {
        names[shortcut]
    }

    public var count: Int { names.count }
}
