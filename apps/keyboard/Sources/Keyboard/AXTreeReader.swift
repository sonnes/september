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

        // The viewer opens only the branch holding the focused element, so that
        // branch must survive the node budget however big the tree is. Walking
        // up from the focused element costs a handful of reads and pins it.
        let path = ancestry(of: focused)

        var counter = 0
        let node = walk(
            root,
            depth: 0,
            maxDepth: maxDepth,
            maxChildren: maxChildren,
            maxNodes: maxNodes,
            focused: focused,
            path: path,
            onPath: true,
            counter: &counter
        )
        return AXTree(appName: app.localizedName ?? "—", root: node)
    }

    /// The focused element and everything above it, up to the app.
    private static func ancestry(of focused: AXUIElement?) -> [AXUIElement] {
        var chain: [AXUIElement] = []
        var current = focused
        // Deep enough for any real tree, shallow enough to never hang on a
        // cycle in a misbehaving app.
        while let element = current, chain.count < 64 {
            chain.append(element)
            current = self.element(element, kAXParentAttribute)
        }
        return chain
    }

    private static func walk(
        _ element: AXUIElement,
        depth: Int,
        maxDepth: Int,
        maxChildren: Int,
        maxNodes: Int,
        focused: AXUIElement?,
        path: [AXUIElement],
        onPath: Bool,
        counter: inout Int
    ) -> AXNode? {
        // Elements on the way to the focused one are read whatever the budget.
        guard counter < maxNodes || onPath else { return nil }
        let id = counter
        counter += 1

        let role = string(element, kAXRoleAttribute) ?? "unknown"
        let label = string(element, kAXTitleAttribute) ?? string(element, kAXDescriptionAttribute)

        var children: [AXNode] = []
        if depth < maxDepth || onPath, role != (kAXMenuBarRole as String) {
            for child in self.children(element).prefix(maxChildren) {
                let childOnPath = path.contains { CFEqual($0, child) }
                guard
                    let node = walk(
                        child,
                        depth: depth + 1,
                        maxDepth: maxDepth,
                        maxChildren: maxChildren,
                        maxNodes: maxNodes,
                        focused: focused,
                        path: path,
                        onPath: childOnPath,
                        counter: &counter
                    )
                else { continue }
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
