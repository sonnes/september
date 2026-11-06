import Foundation
import SeptemberKit
import Testing

private func decode(_ json: String) throws -> PanelDefinition {
    try JSONDecoder().decode(PanelDefinition.self, from: Data(json.utf8))
}

struct PanelTests {
    let editJSON = """
        {
          "title": "EDIT",
          "buttons": [
            {"id": "cut", "label": "Cut", "symbol": "scissors",
             "action": {"type": "shortcut", "modifiers": ["command"], "key": "x"}},
            {"id": "undo", "label": "Undo", "symbol": "arrow.uturn.backward",
             "action": {"type": "shortcut", "modifiers": ["command", "shift"], "key": "z"}},
            {"id": "enter", "label": "Return", "symbol": "return",
             "action": {"type": "shortcut", "modifiers": [], "key": "return"}},
            {"id": "hello", "label": "Hello", "action": {"type": "text", "text": "Hello"}}
          ]
        }
        """

    @Test func `a panel decodes with its buttons and actions`() throws {
        let panel = try decode(editJSON)
        #expect(panel.title == "EDIT")
        #expect(panel.buttons.count == 4)
        #expect(panel.buttons[0].action == .shortcut(Shortcut(modifiers: .command, key: .character("x"))))
        #expect(panel.buttons[1].action == .shortcut(Shortcut(modifiers: [.command, .shift], key: .character("z"))))
        #expect(panel.buttons[2].action == .shortcut(Shortcut(modifiers: [], key: .virtual(.return))))
        #expect(panel.buttons[3].action == .text("Hello"))
    }

    @Test func `panel modifier names decode, fn included`() throws {
        let panel = try decode(
            """
            {"title": "X", "buttons": [{"id": "b", "label": "B",
              "action": {"type": "shortcut", "modifiers": ["function", "command"], "key": "f5"}}]}
            """)
        #expect(panel.buttons[0].action == .shortcut(Shortcut(modifiers: [.function, .command], key: .virtual(.f5))))
    }

    @Test func `an unknown modifier or key name is rejected`() throws {
        for action in [
            #"{"type": "shortcut", "modifiers": ["hyper"], "key": "a"}"#,
            #"{"type": "shortcut", "key": "launch"}"#,
        ] {
            let bad = """
                {"title": "X", "buttons": [{"id": "b", "label": "B", "action": \(action)}]}
                """
            #expect((try? decode(bad)) == nil, "\(action) decoded anyway")
        }
    }

    @Test func `an uppercase key letter is rejected`() {
        let bad = """
            {"title": "X", "buttons": [{"id": "b", "label": "B",
              "action": {"type": "shortcut", "modifiers": ["command"], "key": "T"}}]}
            """
        #expect((try? decode(bad)) == nil, "T decoded anyway")
    }

    @Test func `an unknown action type is rejected rather than silently dropped`() throws {
        let bad = """
            {"title": "X",
             "buttons": [{"id": "b", "label": "B", "action": {"type": "explode"}}]}
            """
        #expect((try? decode(bad)) == nil, "unknown action decoded anyway")
    }

    @Test func `two buttons with one id are rejected`() throws {
        let bad = """
            {"title": "X", "buttons": [
              {"id": "b", "label": "B", "action": {"type": "text", "text": "b"}},
              {"id": "b", "label": "C", "action": {"type": "text", "text": "c"}}]}
            """
        #expect((try? decode(bad)) == nil, "duplicate button ids decoded anyway")
    }

    @Test func `the bundled panels load, with a generic panel for unknown apps`() throws {
        let store = try PanelStore.bundled()
        let generic = store.appPanel(forBundleID: nil)
        #expect(store.appPanel(forBundleID: "com.example.unheard-of") == generic)
        #expect(store.appPanel(forBundleID: "com.microsoft.VSCode") != generic)
    }
}
