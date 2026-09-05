import Foundation
import SeptemberKit

private func decode(_ json: String) throws -> PanelDefinition {
    try JSONDecoder().decode(PanelDefinition.self, from: Data(json.utf8))
}

func panelTests() {
    let editJSON = """
        {
          "id": "edit",
          "title": "EDIT",
          "columns": 2,
          "buttons": [
            {"id": "cut", "label": "Cut", "symbol": "scissors",
             "action": {"type": "shortcut", "modifiers": ["command"], "key": "x"}},
            {"id": "undo", "label": "Undo", "symbol": "arrow.uturn.backward",
             "action": {"type": "shortcut", "modifiers": ["command", "shift"], "key": "z"}},
            {"id": "enter", "label": "Return", "symbol": "return",
             "action": {"type": "shortcut", "modifiers": [], "key": "return"}},
            {"id": "hello", "label": "Hello", "action": {"type": "text", "text": "Hello"}},
            {"id": "more", "label": "More", "action": {"type": "openPanel", "panel": "system"}}
          ]
        }
        """

    test("a panel decodes with its buttons and actions") {
        guard let panel = try? decode(editJSON) else {
            expect(false, "panel failed to decode")
            return
        }
        expectEqual(panel.id, "edit")
        expectEqual(panel.title, "EDIT")
        expectEqual(panel.columns, 2)
        expectEqual(panel.buttons.count, 5)
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
        expectEqual(panel.buttons[4].action, .openPanel("system"))
    }

    test("an unknown action type is rejected rather than silently dropped") {
        let bad = """
            {"id": "x", "title": "X", "columns": 1,
             "buttons": [{"id": "b", "label": "B", "action": {"type": "explode"}}]}
            """
        expect((try? decode(bad)) == nil, "unknown action decoded anyway")
    }

    test("the bundled panels load") {
        guard let store = try? PanelStore.bundled() else {
            expect(false, "bundled panels failed to load")
            return
        }
        expect(!store.allPanels.isEmpty)
        expect(store.allPanels.allSatisfy { !$0.buttons.isEmpty })
    }

    test("app shortcuts fall back to the generic panel for unknown apps") {
        let store = try! PanelStore.bundled()
        let generic = store.appPanel(forBundleID: "com.example.unheard-of")
        expectEqual(generic.id, "app.generic")
        let known = store.appPanel(forBundleID: "com.microsoft.VSCode")
        expectEqual(known.id, "app.com.microsoft.VSCode")
        expect(known.buttons.count > 0)
    }

    test("every bundled panel button has a unique id") {
        let store = try! PanelStore.bundled()
        for panel in store.allPanels {
            let ids = panel.buttons.map(\.id)
            expectEqual(Set(ids).count, ids.count, "duplicate button id in \(panel.id)")
        }
    }
}
