import Foundation
import SeptemberKit

private func decode(_ json: String) throws -> PanelDefinition {
    try JSONDecoder().decode(PanelDefinition.self, from: Data(json.utf8))
}

func panelTests() {
    let editJSON = """
        {
          "title": "EDIT",
          "columns": 2,
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

    test("a panel decodes with its buttons and actions") {
        let panel = try decode(editJSON)
        expectEqual(panel.title, "EDIT")
        expectEqual(panel.columns, 2)
        expectEqual(panel.buttons.count, 4)
        expectEqual(
            panel.buttons[0].action,
            .shortcut(Shortcut(modifiers: .command, key: .character("x")))
        )
        expectEqual(
            panel.buttons[1].action,
            .shortcut(Shortcut(modifiers: [.command, .shift], key: .character("z")))
        )
        expectEqual(
            panel.buttons[2].action,
            .shortcut(Shortcut(modifiers: [], key: .virtual(.return)))
        )
        expectEqual(panel.buttons[3].action, .text("Hello"))
    }

    test("an unknown action type is rejected rather than silently dropped") {
        let bad = """
            {"title": "X", "columns": 1,
             "buttons": [{"id": "b", "label": "B", "action": {"type": "explode"}}]}
            """
        expect((try? decode(bad)) == nil, "unknown action decoded anyway")
    }

    test("an uppercase key letter is rejected, in a shortcut and in a sequence") {
        for action in [
            #"{"type": "shortcut", "modifiers": ["command"], "key": "T"}"#,
            #"{"type": "sequence", "keys": [{"modifiers": ["command"], "key": "T"}]}"#,
        ] {
            let bad = """
                {"title": "X", "columns": 1, "buttons": [{"id": "b", "label": "B", "action": \(action)}]}
                """
            expect((try? decode(bad)) == nil, "\(action) decoded anyway")
        }
    }

    test("two buttons with one id are rejected") {
        let bad = """
            {"title": "X", "columns": 1, "buttons": [
              {"id": "b", "label": "B", "action": {"type": "text", "text": "b"}},
              {"id": "b", "label": "C", "action": {"type": "text", "text": "c"}}]}
            """
        expect((try? decode(bad)) == nil, "duplicate button ids decoded anyway")
    }

    test("the bundled panels load, with a generic panel for unknown apps") {
        let store = try PanelStore.bundled()
        let generic = store.appPanel(forBundleID: nil)
        expectEqual(store.appPanel(forBundleID: "com.example.unheard-of"), generic)
        expect(store.appPanel(forBundleID: "com.microsoft.VSCode") != generic)
    }
}
