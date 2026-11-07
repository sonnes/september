import Foundation
import SeptemberKit

private func node(
    _ id: Int,
    _ role: String,
    title: String? = nil,
    description: String? = nil,
    value: String? = nil,
    focused: Bool = false,
    children: [AXNode] = [],
    childCount: Int? = nil
) -> AXNode {
    AXNode(
        id: id, role: role, title: title, description: description, value: value,
        isFocused: focused, children: children, childCount: childCount)
}

@MainActor
func treeTests() {
    let tree = AXTree(
        appName: "TextEdit",
        root: node(
            0, "AXApplication", title: "TextEdit",
            children: [
                node(
                    1, "AXWindow", title: "note.txt",
                    children: [
                        node(2, "AXScrollArea", children: [
                            node(3, "AXTextArea", value: "hello", focused: true)
                        ])
                    ]),
                node(4, "AXMenuBar"),
            ]))

    test("rows come out depth first, with their depth") {
        let rows = tree.rows()
        expect(rows.map(\.node.id) == [0, 1, 2, 3, 4])
        expect(rows.map(\.depth) == [0, 1, 2, 3, 1])
    }

    test("an element is open exactly when its children were read") {
        let rows = tree.rows()
        let window = rows.first { $0.node.role == "AXWindow" }
        expect(window?.isExpanded == true)

        let menuBar = rows.first { $0.node.role == "AXMenuBar" }
        expect(menuBar?.isExpanded == false)
    }

    test("an element with unread children is shut and counts them") {
        let unread = AXTree(
            appName: "App",
            root: node(
                0, "AXApplication",
                children: [
                    node(1, "AXGroup", childCount: 7),
                    node(2, "AXTextArea", focused: true, childCount: 1),
                ]))
        let rows = unread.rows()
        expect(rows.map(\.node.id) == [0, 1, 2])
        expect(rows.map(\.isExpanded) == [true, false, false])
        expect(rows.map(\.hiddenChildren) == [0, 7, 1])
        expect(rows.map(\.disclosure) == [.open, .shut, .shut])
    }

    test("an open element counts the children it skipped") {
        let partial = AXTree(
            appName: "App",
            root: node(
                0, "AXApplication",
                children: [node(1, "AXWindow", children: [node(2, "AXTextArea", focused: true)], childCount: 50)]))
        let window = partial.rows().first { $0.node.role == "AXWindow" }
        expect(window?.isExpanded == true)
        expect(window?.hiddenChildren == 49)
        expect(window?.disclosure == .open, "skipped children do not shut an open element")
        expect(window?.spokenLabel.contains("open") == true)
        expect(window?.spokenLabel.contains("49") == true)
    }

    test("a shut element tells VoiceOver how many children it hides") {
        let row = AXTreeRow(node: node(1, "AXGroup", childCount: 7), depth: 1)
        expect(row.spokenLabel.contains("7"))
        expect(!row.spokenLabel.contains("open"))
    }

    test("an element with no children has no arrow") {
        let row = AXTreeRow(node: node(1, "AXButton"), depth: 1)
        expect(row.disclosure == .none)
    }

    test("an element with an empty title is labelled by its description") {
        expect(node(0, "AXButton", title: "", description: "Close").label == "Close")
        expect(node(0, "AXButton", title: "Save", description: "Close").label == "Save")
        expect(node(0, "AXGroup", title: "", description: "").label == nil)
    }

    test("an empty tree has no rows") {
        expect(AXTree.empty.rows().count == 0)
    }

    test("the focused element stays flagged through flattening") {
        let focused = tree.rows().filter(\.node.isFocused)
        expect(focused.count == 1)
        expect(focused.first?.node.role == "AXTextArea")
    }

    test("a huge tree is cut off at the limit") {
        let wide = AXTree(
            appName: "Big",
            root: node(0, "AXApplication", children: (1...50).map { node($0, "AXGroup") }))
        expect(wide.rows(limit: 10).count == 10)
    }
}
