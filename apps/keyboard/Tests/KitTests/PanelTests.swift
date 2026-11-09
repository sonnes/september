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

    test("a button can name the part of the screen that its window takes") {
        let panel = try decode("""
            {"title": "X", "columns": 1, "buttons": [
              {"id": "left", "label": "Left Half", "region": {"x": 0, "y": 0, "width": 0.5, "height": 1},
               "action": {"type": "shortcut", "modifiers": ["control", "option"], "key": "left"}},
              {"id": "keys", "label": "Keys",
               "action": {"type": "shortcut", "modifiers": ["command"], "key": "k"}}]}
            """)
        expectEqual(panel.buttons[0].region, WindowRegion(x: 0, y: 0, width: 0.5, height: 1))
        expectEqual(panel.buttons[1].region, nil)
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

    test("the bundled panels load") {
        let store = try PanelStore.bundled()
        for panel in [store.text, store.system, store.rectangle, store.write, store.writeDocuments] {
            expect(!panel.buttons.isEmpty, "\(panel.title) is empty")
        }
    }
}
