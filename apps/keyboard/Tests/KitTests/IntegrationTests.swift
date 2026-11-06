import CoreGraphics
import Foundation
import SeptemberKit

/// The wiring between the tracks: the session that joins the controller, the
/// predictions, the voice, the app panel, and My Panel, and the small types
/// that the app shell uses.
@MainActor
func integrationTests() async {
    speakTextTests()
    wiringTests()
    placementTests()
    await sessionTests()
}

// MARK: - Speak text

@MainActor
private func speakTextTests() {
    test("Speak reads the whole field when nothing is selected") {
        let speak = SpeakText(input: .mirrored(text: "Hello there", caret: 5, selectionLength: 0), isPrivate: false)
        expectEqual(speak?.text, "Hello there")
        expectEqual(speak?.offset, 0)
    }

    test("Speak reads only the selection") {
        let speak = SpeakText(input: .mirrored(text: "Hello there", caret: 6, selectionLength: 5), isPrivate: false)
        expectEqual(speak?.text, "there")
        expectEqual(speak?.offset, 6)
    }

    test("Speak reads the echo of an app that shows no text") {
        expectEqual(SpeakText(input: .local(text: "typed"), isPrivate: false)?.text, "typed")
    }

    test("Speak has nothing to read in a password field, a private field, or an empty bar") {
        expect(SpeakText(input: .secure, isPrivate: false) == nil)
        expect(SpeakText(input: .mirrored(text: "x", caret: 0, selectionLength: 0), isPrivate: true) == nil)
        expect(SpeakText(input: .local(text: "  "), isPrivate: false) == nil)
    }

    test("the spoken word of a selection moves to its place in the bar") {
        let speak = SpeakText(input: .mirrored(text: "Hello there now", caret: 6, selectionLength: 9), isPrivate: false)!
        let word = speak.word(NSRange(location: 0, length: 5), in: "Hello there now")
        expectEqual(word, NSRange(location: 6, length: 5))
    }

    test("the spoken word shows no highlight after the field changes") {
        let speak = SpeakText(input: .mirrored(text: "Hello", caret: 5, selectionLength: 0), isPrivate: false)!
        expect(speak.word(NSRange(location: 0, length: 5), in: "Hello you") == nil)
    }
}

// MARK: - Small wiring

@MainActor
private func wiringTests() {
    test("a prediction in Talk mode joins the bar with no extra space") {
        let talk = TalkSession()
        var modifiers = ModifierState()
        for character in ["c", "u"] {
            talk.press(
                KeyDefinition(id: character, kind: .standard, label: character, action: .character(character)),
                modifiers: &modifiers)
        }
        talk.type("p of tea, ")
        expectEqual(talk.text, "cup of tea, ")
    }

    test("a sequence of My Panel presses as one sequence action") {
        let escape = Shortcut(modifiers: [], key: .virtual(.escape))
        let button = UserButton(id: "r", name: "Rewind", action: .sequence([escape, escape]))
        expectEqual(button.panelActions, [.sequence([escape, escape])])
    }

    test("a chord that the keys send reaches the chord handler") {
        let (controller, sink) = try makeController()
        var chords: [Shortcut] = []
        controller.onChord = { chords.append($0) }
        controller.press(keyDefinition("command-left"))
        controller.press(keyDefinition("key-s"))
        expectEqual(chords, [Shortcut(modifiers: .command, key: .character("s"))])
        expect(!sink.posted.isEmpty)
    }

    test("plain typing is not a chord") {
        let (controller, _) = try makeController()
        var chords: [Shortcut] = []
        controller.onChord = { chords.append($0) }
        controller.press(keyDefinition("key-s"))
        expect(chords.isEmpty)
    }

    test("the tree hides the value of the focused field") {
        let tree = AXTree(
            appName: "Messages",
            root: AXNode(
                id: 0, role: "AXWindow", value: "title",
                children: [AXNode(id: 1, role: "AXTextArea", value: "secret", isFocused: true)]))
        let hidden = tree.hidingFocusedValue()
        expectEqual(hidden.root?.children.first?.value, nil)
        expectEqual(hidden.root?.value, "title")
        expectEqual(hidden.root?.children.first?.role, "AXTextArea")
    }

    test("the usage store counts the presses of My Panel") {
        let usage = UsageStore(fileURL: temporaryDirectory().appendingPathComponent("usage.json"))
        usage.recordUserButton("save")
        usage.recordUserButton("save")
        expectEqual(usage.uses(of: "save"), 2)
        expectEqual(usage.uses(of: "other"), 0)
    }

    test("the Write window counts as the app in front while it is key") {
        var tracker = FrontAppTracker(ownPID: 1)
        let messages = FrontApp(pid: 2, name: "Messages", bundleID: "com.apple.MobileSMS")
        expectEqual(tracker.appActivated(messages), .app(messages))
        expectEqual(tracker.appActivated(FrontApp(pid: 1, name: "Keyboard", bundleID: nil)), nil)
        expectEqual(tracker.writeKeyChanged(true, front: nil), .write)
        expectEqual(tracker.writeKeyChanged(false, front: messages), .app(messages))
        expectEqual(tracker.appActivated(messages), nil)
    }

    test("the app in front after the Write window matches on the process") {
        var tracker = FrontAppTracker(ownPID: 1)
        let first = FrontApp(pid: 2, name: "Terminal", bundleID: "com.apple.Terminal")
        let second = FrontApp(pid: 3, name: "Terminal", bundleID: "com.apple.Terminal")
        _ = tracker.appActivated(first)
        _ = tracker.writeKeyChanged(true, front: nil)
        expectEqual(tracker.appActivated(second), .app(second))
        expectEqual(tracker.writeKeyChanged(false, front: second), nil)
    }

    test("Settings in front keeps the panel of the last app") {
        var tracker = FrontAppTracker(ownPID: 1)
        let mail = FrontApp(pid: 4, name: "Mail", bundleID: "com.apple.mail")
        _ = tracker.appActivated(mail)
        _ = tracker.writeKeyChanged(true, front: nil)
        expectEqual(tracker.writeKeyChanged(false, front: FrontApp(pid: 1, name: nil, bundleID: nil)), nil)
    }
}

private func keyDefinition(_ id: String) -> KeyDefinition {
    for row in KeyboardLayout.rows {
        if let match = row.keys.first(where: { $0.id == id }) { return match }
    }
    fatalError("no key \(id)")
}

// MARK: - Panel placement

@MainActor
private func placementTests() {
    let screen = CGRect(x: 0, y: 0, width: 3000, height: 1600)
    let keys = CGRect(x: 1000, y: 24, width: 1000, height: 400)
    let panel = CGSize(width: 174, height: 340)

    test("Edit sits at the left of the keys and the others at the right") {
        let frames = PanelPlacement.defaultFrames(
            keys: keys, sizes: [.edit: panel, .text: panel, .system: panel, .app: panel])
        let gap = Metrics.Detached.gap
        expectEqual(frames[.edit]?.maxX, keys.minX - gap)
        expectEqual(frames[.text]?.minX, keys.maxX + gap)
        expectEqual(frames[.system]?.minX, keys.maxX + gap * 2 + panel.width)
        expectEqual(frames[.app]?.minX, keys.maxX + gap * 3 + panel.width * 2)
        expectEqual(frames[.edit]?.maxY, keys.maxY)
        expectEqual(frames[.app]?.maxY, keys.maxY)
    }

    test("the group of keys and panels is centred on the screen") {
        let origin = PanelPlacement.keysOrigin(
            keysSize: keys.size, panels: [.edit: panel, .text: panel, .system: panel, .app: panel],
            in: screen, rightInset: 0, margin: 24)
        let group = panel.width * 4 + Metrics.Detached.gap * 4 + keys.width
        expectEqual(origin.x, (screen.width - group) / 2 + panel.width + Metrics.Detached.gap)
        expectEqual(origin.y, 24)
    }

    test("a saved frame on no screen gives way to the default") {
        let saved = CGRect(x: 9000, y: 9000, width: 174, height: 340)
        expect(!PanelPlacement.isVisible(saved, on: [screen]))
        expect(PanelPlacement.isVisible(CGRect(x: 100, y: 100, width: 174, height: 340), on: [screen]))
    }
}

// MARK: - The session

@MainActor
private struct SessionParts {
    let session: KeyboardSession
    let controller: KeyboardController
    let sink: RecordingSink
    let voice: FakeEngine
    let userPanel: UserPanelStore?
}

@MainActor
private func makeSession(
    userPanel: Result<UserPanelStore, any Error>? = nil,
    voiceHolds: Bool = false
) throws -> SessionParts {
    let (controller, sink) = try makeController()
    let defaults = UserDefaults(suiteName: "kit-integration-\(UUID().uuidString)")!
    let folder = temporaryDirectory()
    let voice = FakeEngine()
    voice.holds = voiceHolds
    let speaker = Speaker(
        settings: VoiceSettingsStore(defaults: defaults), system: voice, elevenLabs: FakeEngine())
    let engine = PredictionEngine(
        predictor: SilentPredictor(), completer: CupCompleter(), delay: .milliseconds(5),
        defaults: defaults)
    let appPanels = AppPanelModel(
        store: controller.panels,
        usage: UsageStore(fileURL: folder.appendingPathComponent("usage.json")),
        learner: ShortcutLearner(fileURL: folder.appendingPathComponent("learned.json")),
        settings: AppPanelSettings(defaults: defaults),
        appName: { _ in nil })
    let store =
        userPanel
        ?? Result {
            try UserPanelStore(
                fileURL: folder.appendingPathComponent("my-panel.json"),
                privateTexts: MemoryPrivateTexts())
        }
    let session = KeyboardSession(
        controller: controller, predictions: engine, speaker: speaker, appPanels: appPanels,
        userPanel: store,
        userPanelUsage: UsageStore(fileURL: folder.appendingPathComponent("my-panel-usage.json")))
    return SessionParts(
        session: session, controller: controller, sink: sink, voice: voice,
        userPanel: try? store.get())
}

private struct SilentPredictor: SentencePredicting {
    var availability: PredictionAvailability { .ready }
    func predictions(for context: PredictionContext) async throws -> [String] { [] }
}

private struct CupCompleter: WordCompleting {
    func completions(for context: PredictionContext) -> [WordCompletion] {
        WordCompletion(word: "cup", partial: context.partialWord).map { [$0] } ?? []
    }
}

@MainActor
private func sessionTests() async {
    await asyncTest("the input of the controller feeds the word row") {
        let parts = try makeSession()
        parts.controller.focusChanged(to: field("I would like a cu", caret: 17))
        await parts.session.settle()
        expectEqual(parts.session.predictions.words.map(\.word), ["cup"])
    }

    await asyncTest("Talk mode feeds the predictions with the bar") {
        let parts = try makeSession()
        parts.controller.mode = .talk
        parts.controller.talk.type("a cu")
        await parts.session.settle()
        expectEqual(parts.session.predictions.words.map(\.word), ["cup"])
    }

    await asyncTest("private text turns off the predictions and Speak") {
        let parts = try makeSession()
        parts.controller.focusChanged(to: field("Hello", caret: 5))
        await parts.session.settle()
        expectEqual(parts.session.speakMode, .speak)
        let texts = MemoryPrivateTexts()
        texts.texts["home"] = "1 Main Street"
        parts.controller.privateTexts = texts
        parts.controller.perform(.privateText("home"))
        await parts.session.settle()
        expectEqual(parts.session.predictions.notice, .privateText)
        expectEqual(parts.session.speakMode, .off)
    }

    await asyncTest("a prediction types into the app in Type mode") {
        let parts = try makeSession()
        parts.session.type("p of tea, ")
        expectEqual(parts.sink.typed, ["p of tea, "])
    }

    await asyncTest("a prediction types into the Talk bar in Talk mode") {
        let parts = try makeSession()
        parts.controller.mode = .talk
        parts.session.type("Hello")
        expectEqual(parts.controller.talk.text, "Hello")
        expect(parts.sink.typed.isEmpty)
    }

    await asyncTest("Speak in Type mode reads the selection and highlights it in the bar") {
        let parts = try makeSession(voiceHolds: true)
        parts.voice.words = [NSRange(location: 0, length: 5)]
        parts.controller.focusChanged(to: field("Hello there", caret: 6, selection: 5))
        await parts.session.settle()
        parts.session.speakPressed()
        await parts.session.settle()
        expectEqual(parts.voice.spoken, ["there"])
        expectEqual(parts.session.speakMode, .stop)
        expectEqual(parts.session.spokenWord, NSRange(location: 6, length: 5))
        parts.session.speakPressed()
        await parts.session.settle()
        expectEqual(parts.session.speakMode, .speak)
        expectEqual(parts.session.spokenWord, nil)
    }

    await asyncTest("Speak in Talk mode speaks the bar, and the bar empties when the speech ends") {
        let parts = try makeSession(voiceHolds: true)
        parts.controller.mode = .talk
        parts.controller.talk.type("Can we go")
        await parts.session.settle()
        parts.session.speakPressed()
        await parts.session.settle()
        expectEqual(parts.voice.spoken, ["Can we go"])
        expectEqual(parts.controller.talk.said.lines.map(\.text), ["Can we go"])
        parts.voice.finish()
        await parts.session.settle()
        expectEqual(parts.controller.talk.text, "")
        expectEqual(parts.session.speakMode, .off)
    }

    await asyncTest("Stop in Talk mode keeps the text in the bar") {
        let parts = try makeSession(voiceHolds: true)
        parts.controller.mode = .talk
        parts.controller.talk.type("Wait")
        await parts.session.settle()
        parts.session.speakPressed()
        await parts.session.settle()
        parts.session.speakPressed()
        await parts.session.settle()
        expectEqual(parts.controller.talk.text, "Wait")
        expectEqual(parts.session.speakMode, .speak)
    }

    await asyncTest("a press on the app panel types and counts the press") {
        let parts = try makeSession()
        parts.session.appChanged(name: "Mail", bundleID: "com.apple.mail", windowTitle: nil)
        let button = parts.session.appPanels.panel.buttons[0]
        parts.session.pressAppPanel(button.action)
        expectEqual(parts.session.appPanels.mostUsed(bundleID: "com.apple.mail").first?.button.id, button.id)
    }

    await asyncTest("the Write window gets the Write panel") {
        let parts = try makeSession()
        parts.session.appChanged(name: "Write", bundleID: WritePanel.id, windowTitle: nil)
        expectEqual(parts.session.appPanels.current.bundleID, WritePanel.id)
        expectEqual(parts.controller.frontmostAppName, "Write")
    }

    await asyncTest("Mine ranks its buttons again only when an app comes to the front") {
        let parts = try makeSession()
        let store = try expectValue(parts.userPanel)
        let save = Shortcut(modifiers: .command, key: .character("s"))
        let undo = Shortcut(modifiers: .command, key: .character("z"))
        try store.add(NewButton(name: "Save", action: .shortcut(save)))
        let undoID = try store.add(NewButton(name: "Undo", action: .shortcut(undo)))
        await parts.session.settle()
        expectEqual(parts.session.mineButtons.map(\.name), ["Save", "Undo"])

        let undoButton = store.buttons.first { $0.id == undoID }!
        parts.session.pressMine(undoButton)
        expect(!parts.sink.posted.isEmpty)
        expectEqual(parts.session.mineButtons.map(\.name), ["Save", "Undo"])

        parts.session.appChanged(name: "Notes", bundleID: "com.apple.Notes", windowTitle: nil)
        expectEqual(parts.session.mineButtons.map(\.name), ["Undo", "Save"])
    }

    await asyncTest("a broken My Panel file shows an error and stays as it is") {
        let file = temporaryDirectory().appendingPathComponent("my-panel.json")
        try FileManager.default.createDirectory(
            at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("{ not json".utf8).write(to: file)
        let parts = try makeSession(
            userPanel: Result { try UserPanelStore(fileURL: file, privateTexts: MemoryPrivateTexts()) })
        expect(parts.session.userPanelError != nil)
        expect(parts.session.mineButtons.isEmpty)
        expectEqual(try String(contentsOf: file, encoding: .utf8), "{ not json")
    }

    await asyncTest("a focus move ends the private state of the bar") {
        let parts = try makeSession()
        let texts = MemoryPrivateTexts()
        texts.texts["home"] = "1 Main Street"
        parts.controller.privateTexts = texts
        parts.controller.perform(.privateText("home"))
        expect(parts.controller.isFieldPrivate)
        parts.session.focusMoved()
        expect(!parts.controller.isFieldPrivate)
    }

    await asyncTest("a chord from the keys joins the app panel after two presses") {
        let parts = try makeSession()
        parts.session.appChanged(name: "Mail", bundleID: "com.apple.mail", windowTitle: nil)
        parts.session.menuName = { _ in "Mark as Read" }
        for _ in 0..<2 {
            parts.controller.press(keyDefinition("command-left"))
            parts.controller.press(keyDefinition("shift-left"))
            parts.controller.press(keyDefinition("key-s"))
        }
        let learned = parts.session.appPanels.fullPanel(bundleID: "com.apple.mail").buttons.filter(\.isLearned)
        expectEqual(learned.map(\.label), ["Mark as Read"])
    }
}

private struct MissingValue: Error {}

private func expectValue<T>(_ value: T?) throws -> T {
    guard let value else { throw MissingValue() }
    return value
}

private func field(_ text: String, caret: Int, selection: Int = 0) -> FocusedField {
    FocusedField(
        appName: "Messages", role: "AXTextArea", isEditable: true, isSecure: false, text: text,
        selection: NSRange(location: caret, length: selection))
}

@MainActor
private func asyncTest(_ name: String, _ body: () async throws -> Void) async {
    Run.current = name
    do {
        try await body()
    } catch {
        Run.failures.append("\(name) — threw \(error)")
    }
}
