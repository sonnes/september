import AppKit
import ApplicationServices
import SeptemberKit

/// Snapshots the frontmost app's accessibility tree into `AXTree`.
///
/// A browser window alone holds thousands of elements, so the reader opens only
/// the path from the app to the focused element. Every other element costs its
/// own attributes and a child count.
@MainActor
enum AXTreeReader {
    static func read(app: NSRunningApplication?) -> AXTree {
        guard let app else { return .empty }
        let root = AXUIElementCreateApplication(app.processIdentifier)
        let focused = root.element(kAXFocusedUIElementAttribute)

        var reader = PathReader(focused: focused, path: AXFocus.path(of: focused))
        let node = reader.read(root, opens: true)
        return AXTree(appName: app.localizedName ?? "", root: node)
    }

    private struct PathReader {
        /// The most children read under one open element, plus the one on the
        /// path. A long list or a web page can hold thousands.
        static let maxChildren = 40

        let focused: AXUIElement?
        let path: [AXUIElement]
        var nextID = 0

        mutating func read(_ element: AXUIElement, opens: Bool) -> AXNode {
            let id = nextID
            nextID += 1
            let isFocused = focused.map { CFEqual($0, element) } ?? false

            var children: [AXNode] = []
            let childCount: Int
            if opens, !isFocused {
                let all = element.children
                childCount = all.count
                for (index, child) in all.enumerated() {
                    let onPath = path.contains { CFEqual($0, child) }
                    guard index < PathReader.maxChildren || onPath else { continue }
                    children.append(read(child, opens: onPath))
                }
            } else {
                childCount = element.childCount
            }

            return AXNode(
                id: id,
                role: element.string(kAXRoleAttribute) ?? "unknown",
                title: element.string(kAXTitleAttribute),
                description: element.string(kAXDescriptionAttribute),
                value: element.string(kAXValueAttribute),
                isFocused: isFocused,
                children: children,
                childCount: childCount
            )
        }
    }
}
