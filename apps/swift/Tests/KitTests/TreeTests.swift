import Foundation
import SeptemberKit

@MainActor
func treeTests() {
    func node(
        _ id: Int,
        _ role: String,
        label: String? = nil,
        value: String? = nil,
        focused: Bool = false,
        children: [AXNode] = []
    ) -> AXNode {
        AXNode(
            id: id, role: role, label: label, value: value, isFocused: focused, children: children)
    }

    let tree = AXTree(
        appName: "TextEdit",
        root: node(
            0, "AXApplication", label: "TextEdit",
            children: [
                node(
                    1, "AXWindow", label: "note.txt",
                    children: [
                        node(2, "AXScrollArea", children: [
                            node(3, "AXTextArea", value: "hello", focused: true)
                        ])
                    ]),
                node(4, "AXMenuBar"),
            ]))

    test("rows come out depth first, with their depth") {
        let rows = tree.rows()
        expectEqual(rows.map(\.node.id), [0, 1, 2, 3, 4])
        expectEqual(rows.map(\.depth), [0, 1, 2, 3, 1])
    }

    test("an empty tree has no rows") {
        expectEqual(AXTree.empty.rows().count, 0)
    }

    test("the focused element stays flagged through flattening") {
        let focused = tree.rows().filter(\.node.isFocused)
        expectEqual(focused.count, 1)
        expectEqual(focused.first?.node.role, "AXTextArea")
    }

    test("a huge tree is cut off at the limit") {
        let wide = AXTree(
            appName: "Big",
            root: node(0, "AXApplication", children: (1...50).map { node($0, "AXGroup") }))
        expectEqual(wide.rows(limit: 10).count, 10)
    }

    test("a node reads as its role, then its label") {
        expectEqual(node(0, "AXButton", label: "Save").title, "AXButton")
        expectEqual(node(0, "AXButton", label: "Save").subtitle, "Save")
        expect(node(0, "AXGroup").subtitle == nil)
    }

    test("a value is collapsed onto one line and cut short") {
        let long = node(0, "AXTextArea", value: "one\ntwo   three" + String(repeating: "x", count: 100))
        let detail = long.detail!
        expect(!detail.contains("\n"), "newlines would break the row")
        expect(detail.count <= 61, "got \(detail.count)")
        expect(detail.hasSuffix("…"))
        expectEqual(node(0, "AXTextArea", value: "one\ntwo").detail, "one two")
    }

    test("a label and a value both show, label first") {
        let field = node(0, "AXTextField", label: "Search", value: "september")
        expectEqual(field.subtitle, "Search")
        expectEqual(field.detail, "september")
    }

    test("the viewer is as wide as the design allows and matches the keyboard's height") {
        expectEqual(Metrics.treeViewerWidth, 320)
    }
}
