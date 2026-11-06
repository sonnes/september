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

private func panel(_ buttons: [PanelButton]) -> PanelDefinition {
    PanelDefinition(title: "Test", columns: 2, buttons: buttons)
}

/// A new, empty folder for one test's files.
private func scratchFile(_ name: String) -> URL {
    FileManager.default.temporaryDirectory
        .appendingPathComponent("kit-tests-\(UUID().uuidString)")
        .appendingPathComponent(name)
}

/// A clock that the test moves by hand.
private final class Clock: @unchecked Sendable {
    var now = Date(timeIntervalSince1970: 1_800_000_000)
    func advance(days: Double) { now += days * 86_400 }
}

@MainActor
func appPanelsTests() {
    sequenceTests()
    panelFileTests()
    layoutTests()
    resolverTests()
    usageTests()
    menuIndexTests()
    learnerTests()
    settingsTests()
    modelTests()
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
    test("the Text keypad replaces Navigate, and System holds the moved keys") {
        let store = try PanelStore.bundled()
        expectEqual(store.text.buttons.count, 12)
        expectEqual(
            store.text.buttons.first?.action,
            .shortcut(Shortcut(modifiers: [], key: .virtual(.up))))
        expectEqual(
            store.text.buttons.last?.action,
            .shortcut(Shortcut(modifiers: [.shift, .command], key: .virtual(.right))))
        let system = Set(store.system.buttons.map(\.id))
        for id in ["find", "mission-control", "page-up", "page-down", "zoom-out", "zoom-in"] {
            expect(system.contains(id), "System has no \(id)")
        }
    }

    test("each new app has a panel of 12 slots or fewer") {
        let store = try PanelStore.bundled()
        let ids = [
            "com.apple.MobileSMS", "com.apple.Safari", "com.apple.mail", "com.apple.Notes",
            "com.apple.finder", "com.apple.Terminal", "com.googlecode.iterm2",
            "com.mitchellh.ghostty", AppPanelResolver.claudeCodeID,
        ]
        for id in ids {
            let panel = store.appPanel(forBundleID: id)
            expect(panel != store.generic, "no panel for \(id)")
            expect(AppPanelLayout.slots(panel.buttons) <= AppPanelLayout.slotCount, "\(id) overflows")
        }
        let claude = store.appPanel(forBundleID: AppPanelResolver.claudeCodeID)
        let rewind = claude.buttons.first { $0.id == "rewind" }
        let escape = Shortcut(modifiers: [], key: .virtual(.escape))
        expectEqual(rewind?.action, .sequence([escape, escape]))
    }

    test("every bundled panel fits the two-column grid") {
        let store = try PanelStore.bundled()
        for panel in [store.edit, store.text, store.system] + store.appPanels.map(\.panel) {
            expect(
                AppPanelLayout.slots(panel.buttons) <= AppPanelLayout.slotCount,
                "\(panel.title) overflows")
        }
    }
}

// MARK: - Layout

@MainActor
private func layoutTests() {
    test("a text button takes a whole row, and later keys fill the gap before it") {
        let rows = AppPanelLayout.rows([
            keyButton("a"), textButton("hello"), keyButton("b"), keyButton("c"),
        ])
        expectEqual(rows.map { $0.map(\.id) }, [["a", "b"], ["hello"], ["c"]])
    }

    test("a text button costs two slots") {
        expectEqual(AppPanelLayout.slots([keyButton("a"), textButton("t")]), 3)
    }

    test("only the buttons that fit in 12 slots stay") {
        let buttons = (1...11).map { keyButton("k\($0)") } + [textButton("t"), keyButton("last")]
        let kept = AppPanelLayout.fitting(buttons).map(\.id)
        expectEqual(kept.count, 12)
        expect(!kept.contains("t"), "a text button overflowed the grid")
        expectEqual(kept.last, "last")
    }
}

// MARK: - Resolver

@MainActor
private func resolverTests() {
    test("the resolver picks the app panel by bundle ID, and the generic panel otherwise") {
        let store = try PanelStore.bundled()
        let resolver = AppPanelResolver(store: store)
        let safari = resolver.resolve(bundleID: "com.apple.Safari", windowTitle: "Apple")
        expectEqual(safari.bundleID, "com.apple.Safari")
        expectEqual(safari.panel, store.appPanel(forBundleID: "com.apple.Safari"))
        let unknown = resolver.resolve(bundleID: "com.example.new", windowTitle: nil)
        expectEqual(unknown.bundleID, "com.example.new")
        expectEqual(unknown.panel, store.generic)
        expectEqual(resolver.resolve(bundleID: nil, windowTitle: nil).bundleID, nil)
    }

    test("a terminal window that names Claude Code gets the Claude Code panel") {
        let store = try PanelStore.bundled()
        let resolver = AppPanelResolver(store: store)
        for terminal in AppPanelResolver.terminalBundleIDs {
            let choice = resolver.resolve(bundleID: terminal, windowTitle: "✳ Claude Code")
            expectEqual(choice.bundleID, AppPanelResolver.claudeCodeID, terminal)
        }
        let shell = resolver.resolve(bundleID: "com.apple.Terminal", windowTitle: "~ — zsh — 80×24")
        expectEqual(shell.bundleID, "com.apple.Terminal")
        let notTerminal = resolver.resolve(bundleID: "com.apple.Safari", windowTitle: "Claude Code")
        expectEqual(notTerminal.bundleID, "com.apple.Safari")
    }

    test("the Claude Code title rule matches the titles that Claude Code sets") {
        for title in [
            "✳ Claude Code", "◐ Fix the login bug", "◑ Fix the login bug",
            "✳ Fix the login bug — claude — 120×40", "repo — ✳ Claude Code — 80×24",
            "~/work — claude — 80×24",
        ] {
            expect(AppPanelResolver.namesClaudeCode(title), "missed \(title)")
        }
        for title in ["~ — zsh — 80×24", "vim notes.md", "claudette — zsh", ""] {
            expect(!AppPanelResolver.namesClaudeCode(title), "matched \(title)")
        }
    }

    test("a hidden panel falls back to the generic panel, but keeps the app") {
        let store = try PanelStore.bundled()
        let resolver = AppPanelResolver(store: store, hiddenPanels: ["com.apple.Safari"])
        let safari = resolver.resolve(bundleID: "com.apple.Safari", windowTitle: nil)
        expectEqual(safari.bundleID, "com.apple.Safari")
        expectEqual(safari.panel, store.generic)
    }

    test("a hidden Claude Code panel leaves the terminal panel") {
        let store = try PanelStore.bundled()
        let resolver = AppPanelResolver(
            store: store, hiddenPanels: [AppPanelResolver.claudeCodeID])
        let choice = resolver.resolve(bundleID: "com.apple.Terminal", windowTitle: "✳ Claude Code")
        expectEqual(choice.bundleID, "com.apple.Terminal")
    }
}

// MARK: - Usage

@MainActor
private func usageTests() {
    let mail = panel((1...14).map { keyButton("b\($0)") })

    test("a new panel keeps the order of its file, cut to 12 slots") {
        let usage = UsageStore(fileURL: scratchFile("usage.json"))
        usage.appActivated("com.apple.mail")
        let ranked = usage.ranked(panel: mail, bundleID: "com.apple.mail")
        expectEqual(ranked.buttons.map(\.id), (1...12).map { "b\($0)" })
    }

    test("the most pressed buttons come first after the app comes to the front") {
        let usage = UsageStore(fileURL: scratchFile("usage.json"))
        usage.record(buttonID: "b14", bundleID: "com.apple.mail")
        usage.record(buttonID: "b14", bundleID: "com.apple.mail")
        usage.record(buttonID: "b3", bundleID: "com.apple.mail")
        usage.appActivated("com.apple.mail")
        let ranked = usage.ranked(panel: mail, bundleID: "com.apple.mail").buttons.map(\.id)
        expectEqual(Array(ranked.prefix(3)), ["b14", "b3", "b1"])
        expectEqual(ranked.count, 12)
    }

    test("the order does not move until the app comes to the front again") {
        let usage = UsageStore(fileURL: scratchFile("usage.json"))
        usage.appActivated("com.apple.mail")
        usage.record(buttonID: "b5", bundleID: "com.apple.mail")
        expectEqual(usage.ranked(panel: mail, bundleID: "com.apple.mail").buttons.first?.id, "b1")
        usage.appActivated("com.apple.mail")
        expectEqual(usage.ranked(panel: mail, bundleID: "com.apple.mail").buttons.first?.id, "b5")
    }

    test("a press loses half its weight in 14 days") {
        let clock = Clock()
        let usage = UsageStore(fileURL: scratchFile("usage.json"), now: { clock.now })
        usage.record(buttonID: "b1", bundleID: "app")
        usage.record(buttonID: "b1", bundleID: "app")
        clock.advance(days: 14)
        expect(abs(usage.weight(buttonID: "b1", bundleID: "app") - 1) < 0.0001)
        usage.record(buttonID: "b1", bundleID: "app")
        clock.advance(days: 14)
        expect(abs(usage.weight(buttonID: "b1", bundleID: "app") - 1) < 0.0001)
    }

    test("old presses rank below newer ones") {
        let clock = Clock()
        let usage = UsageStore(fileURL: scratchFile("usage.json"), now: { clock.now })
        for _ in 1...3 { usage.record(buttonID: "b2", bundleID: "app") }
        clock.advance(days: 42)
        usage.record(buttonID: "b4", bundleID: "app")
        usage.appActivated("app")
        expectEqual(usage.ranked(panel: mail, bundleID: "app").buttons.first?.id, "b4")
    }

    test("the counts survive a restart, and the file holds no text") {
        let url = scratchFile("usage.json")
        let first = UsageStore(fileURL: url)
        first.record(buttonID: "b7", bundleID: "com.apple.mail")
        let second = UsageStore(fileURL: url)
        expect(second.weight(buttonID: "b7", bundleID: "com.apple.mail") > 0.99)
        let file = try String(contentsOf: url, encoding: .utf8)
        expect(file.contains("b7") && file.contains("com.apple.mail"))
    }

    test("a broken file starts empty instead of failing") {
        let url = scratchFile("usage.json")
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("not json".utf8).write(to: url)
        let usage = UsageStore(fileURL: url)
        expectEqual(usage.weight(buttonID: "b1", bundleID: "app"), 0)
    }

    test("the most-used list gives the uses of each pressed button, most first") {
        let usage = UsageStore(fileURL: scratchFile("usage.json"))
        usage.record(buttonID: "b2", bundleID: "app")
        for _ in 1...3 { usage.record(buttonID: "b9", bundleID: "app") }
        let rows = usage.mostUsed(panel: mail, bundleID: "app")
        expectEqual(rows.map(\.button.id), ["b9", "b2"])
        expectEqual(rows.map(\.uses), [3, 1])
    }

    test("Reset Usage clears one app only") {
        let usage = UsageStore(fileURL: scratchFile("usage.json"))
        usage.record(buttonID: "b2", bundleID: "app")
        usage.record(buttonID: "b2", bundleID: "other")
        usage.appActivated("app")
        usage.reset(bundleID: "app")
        expectEqual(usage.weight(buttonID: "b2", bundleID: "app"), 0)
        expect(usage.weight(buttonID: "b2", bundleID: "other") > 0)
        expectEqual(usage.ranked(panel: mail, bundleID: "app").buttons.first?.id, "b1")
    }
}

// MARK: - Menu index

private func menuItem(
    _ id: Int, _ title: String, char: String? = nil, virtualKey: UInt16? = nil,
    modifiers: Int = 0, children: [AXNode] = []
) -> AXNode {
    AXNode(
        id: id, role: "AXMenuItem", label: title,
        menuKeys: char == nil && virtualKey == nil
            ? nil : AXMenuKeys(character: char, virtualKey: virtualKey, modifiers: modifiers),
        children: children)
}

@MainActor
private func menuIndexTests() {
    let bar = AXNode(
        id: 0, role: "AXMenuBar",
        children: [
            AXNode(
                id: 1, role: "AXMenuBarItem", label: "File",
                children: [
                    AXNode(
                        id: 2, role: "AXMenu",
                        children: [
                            menuItem(3, "New Tab", char: "T"),
                            menuItem(4, "Reopen Tab", char: "T", modifiers: 1),
                            menuItem(5, "Downloads", char: "L", modifiers: 2),
                            menuItem(6, "Next Tab", virtualKey: 48, modifiers: 4 | 8),
                            menuItem(7, "No Keys"),
                            menuItem(11, "Force Quit", char: "⎋", virtualKey: 53, modifiers: 2),
                            menuItem(
                                8, "More",
                                children: [
                                    AXNode(
                                        id: 9, role: "AXMenu",
                                        children: [menuItem(10, "Deep", char: "9", modifiers: 4)])
                                ]),
                        ])
                ])
        ])

    test("the menu index names a chord from the menu bar") {
        let index = MenuShortcutIndex(menuBar: bar)
        expectEqual(index.name(for: shortcut(.command, "t")), "New Tab")
        expectEqual(index.name(for: shortcut([.shift, .command], "t")), "Reopen Tab")
        expectEqual(index.name(for: shortcut([.option, .command], "l")), "Downloads")
        expectEqual(
            index.name(for: Shortcut(modifiers: .control, key: .virtual(.tab))), "Next Tab")
        expectEqual(index.name(for: shortcut([.control, .command], "9")), "Deep")
        expectEqual(
            index.name(for: Shortcut(modifiers: [.option, .command], key: .virtual(.escape))),
            "Force Quit")
        expectEqual(index.name(for: shortcut(.command, "q")), nil)
    }
}

// MARK: - Learner

@MainActor
private func learnerTests() {
    let downloads = shortcut([.option, .command], "l")

    test("a chord pressed two times joins the panel with its menu name") {
        let learner = ShortcutLearner(fileURL: scratchFile("learned.json"))
        let first = learner.chordPressed(downloads, bundleID: "com.apple.Safari", known: []) { _ in
            "Downloads"
        }
        expectEqual(first, nil)
        let second = learner.chordPressed(downloads, bundleID: "com.apple.Safari", known: []) { _ in
            "Downloads"
        }
        expectEqual(second?.label, "Downloads")
        expectEqual(second?.action, .shortcut(downloads))
        expect(second?.isLearned == true)
        expectEqual(learner.learned(bundleID: "com.apple.Safari").map(\.label), ["Downloads"])
        expectEqual(learner.learned(bundleID: "com.apple.Notes"), [])
    }

    test("a chord with no menu item takes its spoken name") {
        let learner = ShortcutLearner(fileURL: scratchFile("learned.json"))
        let chord = shortcut(.control, "o")
        learner.chordPressed(chord, bundleID: "app", known: []) { _ in nil }
        let button = learner.chordPressed(chord, bundleID: "app", known: []) { _ in nil }
        expectEqual(button?.label, "Control O")
    }

    test("chords without Command or Control, known chords, and app switching are not learned") {
        let learner = ShortcutLearner(fileURL: scratchFile("learned.json"))
        let chords = [
            shortcut(.shift, "a"), shortcut(.option, "e"), shortcut([], "a"),
            Shortcut(modifiers: .command, key: .virtual(.tab)), shortcut(.command, "c"),
        ]
        for chord in chords {
            for _ in 1...3 {
                learner.chordPressed(chord, bundleID: "app", known: [shortcut(.command, "c")]) { _ in
                    "Name"
                }
            }
        }
        expectEqual(learner.learned(bundleID: "app"), [])
    }

    test("the presses count in each app on its own") {
        let learner = ShortcutLearner(fileURL: scratchFile("learned.json"))
        learner.chordPressed(downloads, bundleID: "one", known: []) { _ in "D" }
        learner.chordPressed(downloads, bundleID: "two", known: []) { _ in "D" }
        expectEqual(learner.learned(bundleID: "one"), [])
        expectEqual(learner.learned(bundleID: "two"), [])
    }

    test("learned chords survive a restart, and forget clears one app") {
        let url = scratchFile("learned.json")
        let first = ShortcutLearner(fileURL: url)
        for _ in 1...2 {
            first.chordPressed(downloads, bundleID: "safari", known: []) { _ in "Downloads" }
            first.chordPressed(downloads, bundleID: "notes", known: []) { _ in "Downloads" }
        }
        let second = ShortcutLearner(fileURL: url)
        expectEqual(second.learned(bundleID: "safari").first?.action, .shortcut(downloads))
        second.forget(bundleID: "safari")
        expectEqual(second.learned(bundleID: "safari"), [])
        expectEqual(ShortcutLearner(fileURL: url).learned(bundleID: "notes").count, 1)
    }
}

// MARK: - Settings

@MainActor
private func settingsTests() {
    test("the panel and the learning of each app turn on and off on their own") {
        let suite = "kit-tests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let settings = AppPanelSettings(defaults: defaults)
        expect(settings.isPanelOn("mail") && settings.isLearningOn("mail"))
        settings.setPanelOn(false, for: "mail")
        settings.setLearningOn(false, for: "notes")
        expect(!settings.isPanelOn("mail") && settings.isLearningOn("mail"))
        expect(settings.isPanelOn("notes") && !settings.isLearningOn("notes"))
        expectEqual(settings.hiddenPanels, ["mail"])
        let reloaded = AppPanelSettings(defaults: defaults)
        expect(!reloaded.isPanelOn("mail") && !reloaded.isLearningOn("notes"))
    }
}

// MARK: - Model

@MainActor
private func makeModel() throws -> (AppPanelModel, UserDefaults) {
    let suite = "kit-tests-\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suite)!
    let model = AppPanelModel(
        store: try PanelStore.bundled(),
        usage: UsageStore(fileURL: scratchFile("usage.json")),
        learner: ShortcutLearner(fileURL: scratchFile("learned.json")),
        settings: AppPanelSettings(defaults: defaults),
        appName: { _ in nil })
    return (model, defaults)
}

@MainActor
private func modelTests() {
    test("the model shows the ranked panel of the app in front") {
        let (model, _) = try makeModel()
        model.appActivated(bundleID: "com.apple.mail", windowTitle: nil)
        let reply = model.panel.buttons.first { $0.id == "reply" }!
        model.pressed(reply.action)
        model.pressed(reply.action)
        expectEqual(model.panel.buttons.first?.id, "new-message")
        model.appActivated(bundleID: "com.apple.mail", windowTitle: nil)
        expectEqual(model.panel.buttons.first?.id, "reply")
    }

    test("a title change in a terminal switches to the Claude Code panel") {
        let (model, _) = try makeModel()
        model.appActivated(bundleID: "com.apple.Terminal", windowTitle: "~ — zsh")
        expectEqual(model.current.bundleID, "com.apple.Terminal")
        model.windowTitleChanged("✳ Claude Code")
        expectEqual(model.current.bundleID, AppPanelResolver.claudeCodeID)
        expectEqual(model.panel.title, "Claude Code")
    }

    test("a learned chord joins the panel of the app in front") {
        let (model, _) = try makeModel()
        model.appActivated(bundleID: "com.apple.Safari", windowTitle: nil)
        let downloads = shortcut([.option, .command], "l")
        model.chordPressed(downloads) { _ in "Downloads" }
        model.chordPressed(downloads) { _ in "Downloads" }
        expect(model.panel.buttons.contains { $0.label == "Downloads" && $0.isLearned })
    }

    test("a chord in a keypad or the panel is not learned, and the switch stops learning") {
        let (model, _) = try makeModel()
        model.appActivated(bundleID: "com.apple.Safari", windowTitle: nil)
        let before = model.panel.buttons.count
        for chord in [shortcut(.command, "c"), shortcut(.command, "t")] {
            model.chordPressed(chord) { _ in "Known" }
            model.chordPressed(chord) { _ in "Known" }
        }
        model.settings.setLearningOn(false, for: "com.apple.Safari")
        let other = shortcut([.control, .command], "j")
        model.chordPressed(other) { _ in "Other" }
        model.chordPressed(other) { _ in "Other" }
        expectEqual(model.panel.buttons.count, before)
    }

    test("the panel header names the panel, or the app when it has no panel") {
        let (model, _) = try makeModel()
        model.appActivated(bundleID: "com.apple.Terminal", windowTitle: "✳ Claude Code")
        expectEqual(model.title(appName: "Terminal"), "Claude Code")
        model.appActivated(bundleID: "com.example.new", windowTitle: nil)
        expectEqual(model.title(appName: "New App"), "New App")
        model.setPanelOn(false, for: "com.apple.mail")
        model.appActivated(bundleID: "com.apple.mail", windowTitle: nil)
        expectEqual(model.title(appName: "Mail"), "Mail")
        expectEqual(model.panel.title, model.store.generic.title)
    }

    test("the app list starts with the bundled panels and names each one") {
        let (model, _) = try makeModel()
        let names = model.apps.map(\.name)
        expect(names.contains("Mail") && names.contains("Claude Code"), "\(names)")
    }

    test("Reset Usage forgets the counts and the learned chords of one app") {
        let (model, _) = try makeModel()
        model.appActivated(bundleID: "com.apple.Safari", windowTitle: nil)
        let downloads = shortcut([.option, .command], "l")
        model.chordPressed(downloads) { _ in "Downloads" }
        model.chordPressed(downloads) { _ in "Downloads" }
        model.pressed(model.panel.buttons[0].action)
        model.resetUsage(bundleID: "com.apple.Safari")
        expectEqual(model.mostUsed(bundleID: "com.apple.Safari").count, 0)
        expect(!model.panel.buttons.contains { $0.isLearned })
    }
}
