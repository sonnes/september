import Foundation
import SeptemberKit
import Testing

private func node(
    _ id: Int,
    _ role: String,
    title: String? = nil,
    description: String? = nil,
    value: String? = nil,
    focused: Bool = false,
    children: [AXNode] = []
) -> AXNode {
    AXNode(
        id: id, role: role, title: title, description: description, value: value,
        isFocused: focused, children: children)
}

struct TreeTests {

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

    @Test func `rows come out depth first, with their depth`() throws {
        let rows = tree.rows()
        #expect(rows.map(\.node.id) == [0, 1, 2, 3, 4])
        #expect(rows.map(\.depth) == [0, 1, 2, 3, 1])
    }

    @Test func `only the branch holding the focused element is open`() throws {
        // The menu bar is a sibling of the focused window: it stays shut.
        let rows = tree.rows()
        let menuBar = rows.first { $0.node.role == "AXMenuBar" }
        #expect(menuBar != nil)
        #expect(menuBar?.isExpanded == false)

        let window = rows.first { $0.node.role == "AXWindow" }
        #expect(window?.isExpanded == true, "an ancestor of the focused element is open")
    }

    @Test func `a collapsed element says how much it is hiding`() throws {
        let collapsed = AXTree(
            appName: "Big",
            root: node(
                0, "AXApplication",
                children: [node(1, "AXGroup", children: (2...5).map { node($0, "AXButton") })]))
        let group = collapsed.rows().first { $0.node.role == "AXGroup" }
        #expect(group?.hiddenChildren == 4)
        #expect(collapsed.rows().count == 2, "the group's children stay hidden")
    }

    @Test func `the focused element's own children stay shut, it is the leaf we care about`() throws {
        let deep = AXTree(
            appName: "App",
            root: node(
                0, "AXApplication",
                children: [
                    node(1, "AXTextArea", focused: true, children: [node(2, "AXStaticText")])
                ]))
        #expect(deep.rows().map(\.node.id) == [0, 1])
        #expect(deep.rows().last?.hiddenChildren == 1)
    }

    @Test func `with nothing focused only the top level shows`() throws {
        let unfocused = AXTree(
            appName: "App",
            root: node(
                0, "AXApplication",
                children: [node(1, "AXWindow", children: [node(2, "AXGroup")])]))
        #expect(unfocused.rows().map(\.node.id) == [0, 1])
    }

    @Test func `an element with an empty title is labelled by its description`() {
        #expect(node(0, "AXButton", title: "", description: "Close").label == "Close")
        #expect(node(0, "AXButton", title: "Save", description: "Close").label == "Save")
        #expect(node(0, "AXGroup", title: "", description: "").label == nil)
    }

    @Test func `an empty tree has no rows`() throws {
        #expect(AXTree.empty.rows().count == 0)
    }

    @Test func `the focused element stays flagged through flattening`() throws {
        let focused = tree.rows().filter(\.node.isFocused)
        #expect(focused.count == 1)
        #expect(focused.first?.node.role == "AXTextArea")
    }

    @Test func `a huge tree is cut off at the limit`() throws {
        let wide = AXTree(
            appName: "Big",
            root: node(0, "AXApplication", children: (1...50).map { node($0, "AXGroup") }))
        #expect(wide.rows(limit: 10).count == 10)
    }
}
