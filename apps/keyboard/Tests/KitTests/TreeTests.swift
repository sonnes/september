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

    test("only the branch holding the focused element is open") {
        // The menu bar is a sibling of the focused window: it stays shut.
        let rows = tree.rows()
        let menuBar = rows.first { $0.node.role == "AXMenuBar" }
        expect(menuBar != nil)
        expectEqual(menuBar?.isExpanded, false)

        let window = rows.first { $0.node.role == "AXWindow" }
        expectEqual(window?.isExpanded, true, "an ancestor of the focused element is open")
    }

    test("a collapsed element says how much it is hiding") {
        let collapsed = AXTree(
            appName: "Big",
            root: node(
                0, "AXApplication",
                children: [node(1, "AXGroup", children: (2...5).map { node($0, "AXButton") })]))
        let group = collapsed.rows().first { $0.node.role == "AXGroup" }
        expectEqual(group?.hiddenChildren, 4)
        expectEqual(collapsed.rows().count, 2, "the group's children stay hidden")
    }

    test("the focused element's own children stay shut — it is the leaf we care about") {
        let deep = AXTree(
            appName: "App",
            root: node(
                0, "AXApplication",
                children: [
                    node(1, "AXTextArea", focused: true, children: [node(2, "AXStaticText")])
                ]))
        expectEqual(deep.rows().map(\.node.id), [0, 1])
        expectEqual(deep.rows().last?.hiddenChildren, 1)
    }

    test("with nothing focused only the top level shows") {
        let unfocused = AXTree(
            appName: "App",
            root: node(
                0, "AXApplication",
                children: [node(1, "AXWindow", children: [node(2, "AXGroup")])]))
        expectEqual(unfocused.rows().map(\.node.id), [0, 1])
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

    test("the rows of the sample tree stop at the focused branch") {
        expectEqual(tree.rows().map(\.node.role), [
            "AXApplication", "AXWindow", "AXScrollArea", "AXTextArea", "AXMenuBar",
        ])
    }

}
