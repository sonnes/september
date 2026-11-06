import AppKit
import ApplicationServices
import SeptemberKit

/// Snapshots the frontmost app's accessibility tree into `AXTree`.
///
/// A browser window alone runs to thousands of elements, so the walk is capped
/// in depth, breadth and node count. Menu bars are skipped: every app has one,
/// and none of them is what the user is looking at.
@MainActor
enum AXTreeReader {
    static func read(app: NSRunningApplication?) -> AXTree {
        guard let app else { return .empty }
        let root = AXUIElementCreateApplication(app.processIdentifier)
        let focused = root.element(kAXFocusedUIElementAttribute)

        // The viewer opens only the branch holding the focused element, so that
        // branch has to survive the node budget.
        var walker = Walker(focused: focused, path: ancestry(of: focused))
        let node = walker.walk(root, depth: 0, onPath: true)
        return AXTree(appName: app.localizedName ?? "", root: node)
    }

    /// The focused element and everything above it, up to the app.
    private static func ancestry(of focused: AXUIElement?) -> [AXUIElement] {
        var chain: [AXUIElement] = []
        var current = focused
        // A misbehaving app can report a parent cycle.
        while let element = current, chain.count < 64 {
            chain.append(element)
            current = element.element(kAXParentAttribute)
        }
        return chain
    }

    private struct Walker {
        static let maxDepth = 8
        static let maxChildren = 40

        let focused: AXUIElement?
        let path: [AXUIElement]
        var count = 0

        mutating func walk(_ element: AXUIElement, depth: Int, onPath: Bool) -> AXNode? {
            guard count < AXTree.nodeLimit || onPath else { return nil }
            let id = count
            count += 1

            let role = element.string(kAXRoleAttribute) ?? "unknown"
            var children: [AXNode] = []
            if depth < Walker.maxDepth || onPath, role != (kAXMenuBarRole as String) {
                for child in element.children.prefix(Walker.maxChildren) {
                    let childOnPath = path.contains { CFEqual($0, child) }
                    if let node = walk(child, depth: depth + 1, onPath: childOnPath) {
                        children.append(node)
                    }
                }
            }

            return AXNode(
                id: id,
                role: role,
                label: element.string(kAXTitleAttribute)
                    ?? element.string(kAXDescriptionAttribute),
                value: element.string(kAXValueAttribute),
                isFocused: focused.map { CFEqual($0, element) } ?? false,
                children: children
            )
        }
    }
}
