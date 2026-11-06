import AppKit
import ApplicationServices
import SeptemberKit

/// Reads the menu bar of an app into an `AXNode` tree, with the keys of each
/// menu item, so `MenuShortcutIndex` can name a chord.
///
/// A menu bar runs to hundreds of items, so read it only when a chord is about
/// to join a panel, not on each key press.
@MainActor
enum MenuBarReader {
    private static let maxDepth = 6
    private static let maxNodes = 2_000

    /// The names of the chords in the menu bar of the app, or nil when the app
    /// shows no menu bar to accessibility.
    static func index(for app: NSRunningApplication) -> MenuShortcutIndex? {
        read(pid: app.processIdentifier).map(MenuShortcutIndex.init(menuBar:))
    }

    static func read(pid: pid_t) -> AXNode? {
        let root = AXUIElementCreateApplication(pid)
        guard let bar = root.element(kAXMenuBarAttribute) else { return nil }
        var count = 0
        return walk(bar, depth: 0, count: &count)
    }

    private static func walk(_ element: AXUIElement, depth: Int, count: inout Int) -> AXNode? {
        guard count < maxNodes else { return nil }
        let id = count
        count += 1

        var children: [AXNode] = []
        if depth < maxDepth {
            for child in element.children {
                if let node = walk(child, depth: depth + 1, count: &count) {
                    children.append(node)
                }
            }
        }

        return AXNode(
            id: id,
            role: element.string(kAXRoleAttribute) ?? "unknown",
            label: element.string(kAXTitleAttribute),
            menuKeys: menuKeys(of: element),
            children: children
        )
    }

    /// The keys of a menu item, or nil when it has no chord.
    private static func menuKeys(of element: AXUIElement) -> AXMenuKeys? {
        let character = element.string(kAXMenuItemCmdCharAttribute)
        let virtualKey = element.number(kAXMenuItemCmdVirtualKeyAttribute).flatMap { UInt16(exactly: $0) }
        guard character?.isEmpty == false || virtualKey != nil else { return nil }
        return AXMenuKeys(
            character: character,
            virtualKey: virtualKey,
            modifiers: element.number(kAXMenuItemCmdModifiersAttribute) ?? 0
        )
    }
}
