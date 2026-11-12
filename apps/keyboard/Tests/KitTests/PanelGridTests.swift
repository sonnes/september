import Foundation
import SeptemberKit

private func decode(_ json: String) throws -> PanelDefinition {
    try JSONDecoder().decode(PanelDefinition.self, from: Data(json.utf8))
}

private func shortcut(_ modifiers: Modifiers, _ key: String) -> Shortcut {
    Shortcut(modifiers: modifiers, key: .character(key))
}

private func keyButton(_ id: String, _ modifiers: Modifiers = .command, _ key: String = "k")
    -> PanelButton
{
    PanelButton(id: id, label: id, symbol: nil, action: .shortcut(shortcut(modifiers, key)))
}

private func textButton(_ id: String) -> PanelButton {
    PanelButton(id: id, label: id, symbol: nil, action: .text(id))
}

@MainActor
func panelGridTests() {
    sequenceTests()
    panelFileTests()
    layoutTests()
}

// MARK: - Sequence

@MainActor
private func sequenceTests() {
    test("a sequence action decodes its keys in order") {
        let panel = try decode(
            """
            {"title": "X", "columns": 2, "buttons": [
              {"id": "rewind", "label": "Rewind", "action": {"type": "sequence", "keys": [
                {"modifiers": [], "key": "escape"}, {"modifiers": [], "key": "escape"}]}},
              {"id": "exit", "label": "Exit", "action": {"type": "sequence", "keys": [
                {"modifiers": ["control"], "key": "c"}, {"modifiers": ["control"], "key": "c"}]}}]}
            """)
        let escape = Shortcut(modifiers: [], key: .virtual(.escape))
        expectEqual(panel.buttons[0].action, .sequence([escape, escape]))
        expectEqual(
            panel.buttons[1].action,
            .sequence([shortcut(.control, "c"), shortcut(.control, "c")]))
    }

    test("an empty sequence is rejected") {
        let bad = """
            {"title": "X", "columns": 2, "buttons": [
              {"id": "b", "label": "B", "action": {"type": "sequence", "keys": []}}]}
            """
        expect((try? decode(bad)) == nil, "an empty sequence decoded anyway")
    }

    test("a sequence button speaks its name and each step") {
        let exit = PanelButton(
            id: "exit", label: "Exit", symbol: nil,
            action: .sequence([shortcut(.control, "c"), shortcut(.control, "c")]))
        expectEqual(exit.accessibilityLabel, "Exit, Control C, then Control C")
    }

    test("the controller presses each step of a sequence in order") {
        let (controller, sink) = try makeController()
        controller.perform(.sequence([shortcut(.command, "a"), shortcut(.command, "c")]))
        let downs = sink.downs.filter { $0.key != 55 }
        expectEqual(downs.map(\.key), [0, 8])
        expect(downs.allSatisfy { $0.flags == .command }, "a step lost its modifier")
    }
}

// MARK: - Bundled panels

@MainActor
private func panelFileTests() {
    test("the Text keypad has its moves above an inverted T of arrows, and System holds the moved keys") {
        let store = try PanelStore.bundled()
        expectEqual(store.text.buttons.count, 8)
        expectEqual(
            store.text.buttons.first?.action,
            .shortcut(Shortcut(modifiers: .option, key: .virtual(.left))))
        expectEqual(
            store.text.buttons.last?.action,
            .shortcut(Shortcut(modifiers: [.shift, .command], key: .virtual(.right))))
        let arrows = try expectValue(store.text.arrows)
        expectEqual(arrows.columns, 3)
        expectEqual(
            arrows.buttons.map(\.action),
            [VirtualKey.pageUp, .up, .pageDown, .left, .down, .right].map {
                .shortcut(Shortcut(modifiers: [], key: .virtual($0)))
            })
        let system = Set(store.system.buttons.map(\.id))
        for id in ["find", "mission-control", "zoom-out", "zoom-in"] {
            expect(system.contains(id), "System has no \(id)")
        }
        let scrolls = store.system.buttons.compactMap { button -> ScrollDirection? in
            if case .scroll(let direction) = button.action { return direction }
            return nil
        }
        expectEqual(scrolls, [.up, .down])
    }

    test("the Rectangle panel presses the recommended shortcuts of Rectangle") {
        let store = try PanelStore.bundled()
        let panel = store.rectangle
        expectEqual(panel.columns, 3)
        expectEqual(panel.buttons.count, 18)
        func action(_ id: String) -> PanelAction? { panel.buttons.first { $0.id == id }?.action }
        expectEqual(
            action("left-half"), .shortcut(Shortcut(modifiers: [.control, .option], key: .virtual(.left))))
        expectEqual(
            action("first-third"), .shortcut(Shortcut(modifiers: [.control, .option], key: .character("d"))))
        expectEqual(
            action("restore"), .shortcut(Shortcut(modifiers: [.control, .option], key: .virtual(.delete))))
        for button in panel.buttons {
            expect(button.region != nil || button.symbol != nil, "\(button.id) has no icon")
        }
        expectEqual(
            panel.buttons.first { $0.id == "first-two-thirds" }?.region,
            WindowRegion(x: 0, y: 0, width: 2.0 / 3, height: 1))
    }

    test("System quits the app in front with Command Q") {
        let store = try PanelStore.bundled()
        expectEqual(
            store.system.buttons.first { $0.id == "quit" }?.action,
            .shortcut(Shortcut(modifiers: .command, key: .character("q"))))
    }

    test("a text button of marks only is one key wide and shows its marks") {
        let heading = PanelButton(id: "h", label: "Heading", symbol: nil, action: .text("# "))
        let clear = PanelButton(id: "c", label: "Clear", symbol: nil, action: .text("/clear"))
        expect(PanelLayout.slots([heading]) == 1)
        expect(heading.hint == "#")
        expect(PanelLayout.slots([clear]) == 2)
        expect(clear.hint == nil)
    }

    test("an arrow block may not reuse the ID of a button") {
        let json = Data(#"""
            {"title": "T", "columns": 2,
             "buttons": [{"id": "up", "label": "Up", "action": {"type": "shortcut", "key": "up"}}],
             "arrows": {"columns": 3,
                        "buttons": [{"id": "up", "label": "Up", "action": {"type": "shortcut", "key": "up"}}]}}
            """#.utf8)
        expect((try? JSONDecoder().decode(PanelDefinition.self, from: json)) == nil)
    }

    test("each keypad has six rows at most") {
        let store = try PanelStore.bundled()
        for keypad in [store.text, store.system] {
            func rows(_ count: Int, _ columns: Int) -> Int { (count + columns - 1) / columns }
            let arrowRows = keypad.arrows.map { rows($0.buttons.count, $0.columns) } ?? 0
            expect(
                rows(keypad.buttons.count, keypad.columns) + arrowRows <= PanelLayout.slotCount / 2,
                "\(keypad.title) has too many rows")
        }
    }

    test("System holds the shortcuts of editing, and no keypad repeats a clipboard button") {
        let store = try PanelStore.bundled()
        let system = store.system.buttons.map(\.id)
        for id in ["undo", "redo", "select-all", "save", "new", "open", "print", "close"] {
            expect(system.contains(id), "System has no \(id)")
        }
        let chords = (store.text.buttons + (store.text.arrows?.buttons ?? []) + store.system.buttons)
            .compactMap { button -> Shortcut? in
                if case .shortcut(let shortcut) = button.action { return shortcut }
                return nil
            }
        expect(Set(chords).isDisjoint(with: ClipboardShortcut.all), "a keypad repeats a clipboard button")
    }

    test("the Write panels fit the two-column grid") {
        let store = try PanelStore.bundled()
        for panel in [store.write, store.writeDocuments] {
            expect(
                PanelLayout.slots(panel.buttons) <= PanelLayout.slotCount,
                "\(panel.title) overflows")
        }
    }
}

// MARK: - Layout

@MainActor
private func layoutTests() {
    test("a text button takes a whole row, and later keys fill the gap before it") {
        let rows = PanelLayout.rows([
            keyButton("a"), textButton("hello"), keyButton("b"), keyButton("c"),
        ])
        expectEqual(rows.map { $0.map(\.id) }, [["a", "b"], ["hello"], ["c"]])
    }

    test("a text button costs two slots") {
        expectEqual(PanelLayout.slots([keyButton("a"), textButton("t")]), 3)
    }

    test("only the buttons that fit in 12 slots stay") {
        let buttons = (1...11).map { keyButton("k\($0)") } + [textButton("t"), keyButton("last")]
        let kept = PanelLayout.fitting(buttons).map(\.id)
        expectEqual(kept.count, 12)
        expect(!kept.contains("t"), "a text button overflowed the grid")
        expectEqual(kept.last, "last")
    }
}
