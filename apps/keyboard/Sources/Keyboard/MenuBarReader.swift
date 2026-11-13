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
    /// The menu items with a chord of the app, for the shortcut suggestions.
    static func shortcuts(pid: pid_t) -> [AppShortcut] {
        read(pid: pid).map(AppShortcut.menu) ?? []
    }

    static func read(pid: pid_t) -> AXNode? {
        AXFocus.menuBar(pid: pid) { element, id, children in
            let keys = menuKeys(of: element)
            return AXNode(
                id: id,
                role: element.string(kAXRoleAttribute) ?? "unknown",
                title: element.string(kAXTitleAttribute),
                menuKeys: keys,
                // Only an item with a chord can be a suggestion, so only its
                // state is read.
                isEnabled: keys == nil || element.number(kAXEnabledAttribute) != 0,
                children: children
            )
        }
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
