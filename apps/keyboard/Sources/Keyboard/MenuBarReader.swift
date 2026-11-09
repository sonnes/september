import AppKit
import ApplicationServices
import SeptemberKit

/// Reads the menu bar of an app into an `AXNode` tree, with the keys of each
/// menu item and whether it is on. `AppShortcut.menu(_:)` lists the shortcut
/// suggestions from it.
///
/// A menu bar runs to hundreds of items, so read it only when a suggestion
/// needs it, not on each key press.
@MainActor
enum MenuBarReader {
    private static let maxDepth = 6
    private static let maxNodes = 2_000

    /// The menu items with a chord of the app, for the shortcut suggestions.
    static func shortcuts(for app: NSRunningApplication) -> [AppShortcut] {
        read(pid: app.processIdentifier).map(AppShortcut.menu) ?? []
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

        let keys = menuKeys(of: element)
        return AXNode(
            id: id,
            role: element.string(kAXRoleAttribute) ?? "unknown",
            title: element.string(kAXTitleAttribute),
            menuKeys: keys,
            // Only an item with a chord can be a suggestion, so only its state
            // is read.
            isEnabled: keys == nil || element.number(kAXEnabledAttribute) != 0,
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
