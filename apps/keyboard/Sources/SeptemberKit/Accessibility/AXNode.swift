import Foundation

/// One element of another app's accessibility tree, snapshotted for display.
///
/// This is what the viewer shows and what Keyboard itself reads to find the
/// field it mirrors — the same tree Switch Control and VoiceOver walk.
public struct AXNode: Equatable, Sendable, Identifiable {
    public let id: Int
    /// `AXWindow`, `AXTextArea`, `AXButton`…
    public let role: String
    /// Its title or description, when it has one.
    public let label: String?
    public let value: String?
    /// The element the app has focused — the one keystrokes reach.
    public let isFocused: Bool
    public let children: [AXNode]

    public init(
        id: Int,
        role: String,
        label: String? = nil,
        value: String? = nil,
        isFocused: Bool = false,
        children: [AXNode] = []
    ) {
        self.id = id
        self.role = role
        self.label = label
        self.value = value
        self.isFocused = isFocused
        self.children = children
    }

    public var title: String { role }

    public var subtitle: String? {
        guard let label, !label.isEmpty else { return nil }
        return label
    }

    /// The value on one line, short enough for a row.
    public var detail: String? {
        guard let value, !value.isEmpty else { return nil }
        let flat = value.split(whereSeparator: \.isWhitespace).joined(separator: " ")
        guard flat.count > AXNode.detailLimit else { return flat }
        return flat.prefix(AXNode.detailLimit) + "…"
    }

    private static let detailLimit = 60

    /// One line for VoiceOver, since the columns mean nothing spoken.
    public var spokenDescription: String {
        [role, subtitle, detail].compactMap { $0 }.joined(separator: ", ")
    }
}

/// A snapshot of one app's accessibility tree.
public struct AXTree: Equatable, Sendable {
    public let appName: String
    public let root: AXNode?

    public init(appName: String, root: AXNode?) {
        self.appName = appName
        self.root = root
    }

    public static let empty = AXTree(appName: "", root: nil)

    /// Depth first, the order the tree reads on screen — but collapsed. Only
    /// the branch leading to the focused element opens, because that is the one
    /// the user is working in; everything else shows as a shut row with a count
    /// of what it is holding. Trees run to thousands of elements, so the viewer
    /// still takes no more than `limit` rows.
    public func rows(limit: Int = 400) -> [AXTreeRow] {
        guard let root else { return [] }
        var rows: [AXTreeRow] = []
        var stack = [(node: root, depth: 0)]
        while let (node, depth) = stack.popLast(), rows.count < limit {
            // The root opens so the app is never a dead end; below it, only
            // ancestors of the focused element do.
            let isExpanded = !node.children.isEmpty && (depth == 0 || node.leadsToFocus)
            rows.append(
                AXTreeRow(
                    node: node,
                    depth: depth,
                    isExpanded: isExpanded,
                    hiddenChildren: isExpanded ? 0 : node.children.count
                )
            )
            guard isExpanded else { continue }
            for child in node.children.reversed() {
                stack.append((child, depth + 1))
            }
        }
        return rows
    }
}

extension AXNode {
    /// True when the focused element is somewhere below this one — the test for
    /// whether a branch should be open.
    var leadsToFocus: Bool {
        children.contains { $0.isFocused || $0.leadsToFocus }
    }
}

/// A flattened node: how deep it sits, and whether it is holding anything back.
public struct AXTreeRow: Equatable, Sendable, Identifiable {
    public let node: AXNode
    public let depth: Int
    public let isExpanded: Bool
    /// How many children the row is not showing.
    public let hiddenChildren: Int

    public init(node: AXNode, depth: Int, isExpanded: Bool = true, hiddenChildren: Int = 0) {
        self.node = node
        self.depth = depth
        self.isExpanded = isExpanded
        self.hiddenChildren = hiddenChildren
    }

    public var id: Int { node.id }
}
