import AppKit
import ApplicationServices
import SeptemberKit

/// Snapshots the frontmost app's accessibility tree into `AXTree`.
///
/// Trees are unbounded — a browser window alone runs to thousands of elements —
/// so the walk is capped in depth and breadth, and menu bars are skipped: every
/// app has one, none of them is what the user is looking at.
@MainActor
enum AXTreeReader {
    static func read(
        app: NSRunningApplication?,
        maxDepth: Int = 8,
        maxChildren: Int = 40,
        maxNodes: Int = 400
    ) -> AXTree {
        guard let app else { return .empty }
        let root = AXUIElementCreateApplication(app.processIdentifier)
        let focused = element(root, kAXFocusedUIElementAttribute)

        var counter = 0
        let node = walk(
            root,
            depth: 0,
            maxDepth: maxDepth,
            maxChildren: maxChildren,
            maxNodes: maxNodes,
            focused: focused,
            counter: &counter
        )
        return AXTree(appName: app.localizedName ?? "—", root: node)
    }

    private static func walk(
        _ element: AXUIElement,
        depth: Int,
        maxDepth: Int,
        maxChildren: Int,
        maxNodes: Int,
        focused: AXUIElement?,
        counter: inout Int
    ) -> AXNode? {
        guard counter < maxNodes else { return nil }
        let id = counter
        counter += 1

        let role = string(element, kAXRoleAttribute) ?? "unknown"
        let label = string(element, kAXTitleAttribute) ?? string(element, kAXDescriptionAttribute)

        var children: [AXNode] = []
        if depth < maxDepth, role != (kAXMenuBarRole as String) {
            for child in self.children(element).prefix(maxChildren) {
                guard
                    let node = walk(
                        child,
                        depth: depth + 1,
                        maxDepth: maxDepth,
                        maxChildren: maxChildren,
                        maxNodes: maxNodes,
                        focused: focused,
                        counter: &counter
                    )
                else { break }
                children.append(node)
            }
        }

        return AXNode(
            id: id,
            role: role,
            label: label,
            value: string(element, kAXValueAttribute),
            isFocused: focused.map { CFEqual($0, element) } ?? false,
            children: children
        )
    }

    // MARK: - Attribute plumbing

    private static func copy(_ element: AXUIElement, _ attribute: String) -> CFTypeRef? {
        var value: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, attribute as CFString, &value) == .success
        else { return nil }
        return value
    }

    private static func string(_ element: AXUIElement, _ attribute: String) -> String? {
        copy(element, attribute) as? String
    }

    private static func element(_ element: AXUIElement, _ attribute: String) -> AXUIElement? {
        guard let value = copy(element, attribute), CFGetTypeID(value) == AXUIElementGetTypeID()
        else { return nil }
        return (value as! AXUIElement)
    }

    private static func children(_ element: AXUIElement) -> [AXUIElement] {
        copy(element, kAXChildrenAttribute) as? [AXUIElement] ?? []
    }
}
