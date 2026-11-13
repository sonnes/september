import Foundation
import SeptemberKit

final class FakeContextNode: ContextNode {
    let role: String?
    let subrole: String?
    let identifier: String?
    let texts: [ContextAttribute: String]
    let children: [FakeContextNode]

    init(
        _ role: String, subrole: String? = nil, id identifier: String? = nil,
        _ texts: [ContextAttribute: String] = [:], _ children: [FakeContextNode] = []
    ) {
        self.role = role
        self.subrole = subrole
        self.identifier = identifier
        self.texts = texts
        self.children = children
    }

    convenience init(
        _ role: String, subrole: String? = nil, id identifier: String? = nil, _ children: [FakeContextNode]
    ) {
        self.init(role, subrole: subrole, id: identifier, [:], children)
    }

    func text(_ attribute: ContextAttribute) -> String? { texts[attribute] }
    func isSame(as other: FakeContextNode) -> Bool { self === other }
}

/// The path from `node` up to `root`: the node first, the root last.
func contextPath(to node: FakeContextNode, in root: FakeContextNode) -> [FakeContextNode] {
    if root === node { return [node] }
    for child in root.children {
        let path = contextPath(to: node, in: child)
        if !path.isEmpty { return path + [root] }
    }
    return []
}

private let whatsAppRule = ContextRule(
    name: "WhatsApp",
    title: TextMatch(match: ElementMatch(identifier: "NavigationBar_HeaderViewButton"), attribute: .description),
    conversation: ElementMatch(identifier: "ChatMessagesTableView"),
    message: TextMatch(match: ElementMatch(identifier: "WAMessageBubbleTableViewCell"), attribute: .description))

private func bubble(_ text: String) -> FakeContextNode {
    FakeContextNode("AXStaticText", id: "WAMessageBubbleTableViewCell", [.description: text])
}

@MainActor
func screenContextTests() {
    test("every bundled context rule decodes, keyed by bundle ID") {
        let rules = try ContextRules.bundled()
        expectEqual(rules.rule(for: "net.whatsapp.WhatsApp")?.name, "WhatsApp")
        expect(rules.rule(for: "com.example.none") == nil)
    }

    test("a match needs an identifier, a role, or a subrole") {
        let empty = Data(#"{"name": "X", "conversation": {}, "message": {"match": {"role": "AXStaticText"}, "attribute": "value"}}"#.utf8)
        expect((try? JSONDecoder().decode(ContextRule.self, from: empty)) == nil)
    }

    test("the WhatsApp rule reads the open chat and not the chat list") {
        let composer = FakeContextNode("AXTextArea", id: "ChatBar_ComposerTextView", [.description: "Compose message"])
        let window = FakeContextNode(
            "AXWindow", [.title: "WhatsApp"],
            [
                FakeContextNode(
                    "AXGroup", id: "ChatListView_TableView",
                    [FakeContextNode("AXButton", [.value: "Bob, secret plans, 9:00"])]),
                FakeContextNode("AXButton", id: "NavigationBar_HeaderViewButton", [.description: "\u{200E}Ann Lee"]),
                FakeContextNode(
                    "AXGroup", id: "ChatMessagesTableView",
                    [
                        bubble("\u{200E}message, Are you coming\ntonight?, 9:41 PM, Ann Lee"),
                        FakeContextNode("AXHeading", [.description: "Today"]),
                        bubble("\u{200E}Your message, Yes, at eight, 9:42 PM, Read"),
                    ]),
                composer,
            ])
        let screen = ScreenContextExtractor.extract(
            path: contextPath(to: composer, in: window), rule: whatsAppRule, appName: "WhatsApp")
        expectEqual(screen.title, "Ann Lee")
        expectEqual(screen.field, "Compose message")
        expectEqual(
            screen.lines,
            ["message, Are you coming tonight?, 9:41 PM, Ann Lee", "Your message, Yes, at eight, 9:42 PM, Read"])
    }

    test("a long chat keeps the newest messages that fit the budget") {
        let composer = FakeContextNode("AXTextArea")
        let messages = (1...200).map { bubble("Message number \($0) with some words in it") }
        let window = FakeContextNode(
            "AXWindow", [FakeContextNode("AXGroup", id: "ChatMessagesTableView", messages), composer])
        let screen = ScreenContextExtractor.extract(
            path: contextPath(to: composer, in: window), rule: whatsAppRule, appName: nil)
        expect(screen.lines.joined().count <= ScreenContextExtractor.characterBudget)
        expectEqual(screen.lines.last, "Message number 200 with some words in it")
        expect(screen.lines.count > 10)
    }

    test("with no rule, the text before the field is read, nearest last, without the sidebar") {
        let composer = FakeContextNode("AXTextArea", [.description: "Message"])
        let window = FakeContextNode(
            "AXWindow", [.title: "Chat"],
            [
                FakeContextNode(
                    "AXGroup", subrole: "AXLandmarkNavigation",
                    [FakeContextNode("AXStaticText", [.value: "Other thread"])]),
                FakeContextNode(
                    "AXGroup", subrole: "AXLandmarkMain",
                    [
                        FakeContextNode(
                            "AXGroup",
                            [
                                FakeContextNode("AXStaticText", [.value: "Hello there"]),
                                FakeContextNode("AXTextField", [.value: "a draft somewhere else"]),
                                FakeContextNode("AXGroup", [FakeContextNode("AXStaticText", [.value: "How are you?"])]),
                            ]),
                        composer,
                        FakeContextNode("AXStaticText", [.value: "Text after the field"]),
                    ]),
            ])
        let screen = ScreenContextExtractor.extract(
            path: contextPath(to: composer, in: window), rule: nil, appName: "Chat App")
        expectEqual(screen.lines, ["Hello there", "How are you?"])
        expectEqual(screen.title, "Chat")
        expectEqual(screen.field, "Message")
        expectEqual(screen.appName, "Chat App")
    }

    test("a password field and other fields give no text") {
        let composer = FakeContextNode("AXTextArea")
        let window = FakeContextNode(
            "AXWindow",
            [
                FakeContextNode("AXTextField", subrole: "AXSecureTextField", [.value: "hunter2"]),
                FakeContextNode("AXComboBox", [.value: "search words"]),
                composer,
            ])
        let screen = ScreenContextExtractor.extract(
            path: contextPath(to: composer, in: window), rule: nil, appName: nil)
        expect(screen.lines.isEmpty)
    }

    test("the read stops when its time is up") {
        let composer = FakeContextNode("AXTextArea")
        let window = FakeContextNode(
            "AXWindow", [FakeContextNode("AXStaticText", [.value: "Hello"]), composer])
        let screen = ScreenContextExtractor.extract(
            path: contextPath(to: composer, in: window), rule: nil, appName: nil, isExpired: { true })
        expect(screen.lines.isEmpty)
    }

    test("a line loses its direction marks and line breaks, and a long line is cut") {
        expectEqual(ScreenContextExtractor.clean("\u{200E}\u{202A}Hi\n\nthere  you\u{202C}"), "Hi there you")
        let long = ScreenContextExtractor.clean(String(repeating: "word ", count: 200))
        expect(long.count <= ScreenContextExtractor.lineLimit + 1)
        expect(long.hasSuffix("…"))
    }

    test("a screen context never prints its text") {
        let screen = ScreenContext(appName: "WhatsApp", title: "Ann Lee", field: nil, lines: ["secret plans"])
        expect(!String(describing: screen).contains("secret"))
        expect(!String(describing: screen).contains("Ann"))
    }

    let screen = ScreenContext(
        appName: "WhatsApp", title: "Ann Lee", field: "Compose message",
        lines: ["message, Are you coming tonight?, 9:41 PM, Ann Lee"])

    test("the prompt of Type mode holds the text on screen before the input") {
        let context = PredictionContext(
            text: "Yes I", caret: 5, mode: .type, said: ["Hello"], screen: screen)
        let prompt = SuggestionPrompt(context: context)
        expect(prompt.instructions.contains("\"Screen\""))
        let text = prompt.prompt
        guard let screenAt = text.range(of: "Are you coming tonight?"),
            let inputAt = text.range(of: "Current input")
        else { return expect(false, "the prompt lacks the screen or the input") }
        expect(screenAt.lowerBound < inputAt.lowerBound)
        expect(text.contains("App: WhatsApp"))
        expect(text.contains("Title: Ann Lee"))
        expect(text.contains("Field: Compose message"))
    }

    test("with the text on screen, an empty field may answer the other person") {
        let prompt = SuggestionPrompt(
            context: PredictionContext(text: "", caret: 0, mode: .type, said: [], screen: screen))
        expect(prompt.prompt.contains("Are you coming tonight?"))
        expect(!prompt.instructions.contains("invisible"))
        let plain = SuggestionPrompt(context: PredictionContext(text: "", caret: 0, mode: .type, said: []))
        expect(plain.instructions.contains("invisible"))
    }

    test("Talk mode sends no text from the screen") {
        let prompt = SuggestionPrompt(
            context: PredictionContext(text: "Yes", caret: 3, mode: .talk, said: [], screen: screen))
        expect(!prompt.prompt.contains("Are you coming"))
        expect(!prompt.instructions.contains("\"Screen\""))
    }
}
