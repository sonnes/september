import AppKit
import CoreGraphics
import Foundation
import SeptemberKit
import SwiftUI

/// The wiring between the tracks: the session that joins the controller, the
/// predictions, the voice, the Write panel, and My Panel, and the small types
/// that the app shell uses.
@MainActor
func integrationTests() async {
    speakTextTests()
    wiringTests()
    placementTests()
    inputBarTests()
    await sessionTests()
    await shortcutTests()
    await clipboardSessionTests()
    await panelHeightTests()
    activationTests()
}

// MARK: - The input bar

private func focus(_ role: String, editable: Bool = false, secure: Bool = false, caret: Bool = false) -> FocusedField {
    FocusedField(
        appName: "App", role: role, isEditable: editable, isSecure: secure, text: nil,
        selection: caret ? NSRange(location: 0, length: 0) : nil)
}

@MainActor
private func inputBarTests() {
    test("a text field, a password field, a terminal, and an editable web page are text input") {
        expect(focus("AXTextField", editable: true).isTextInput)
        expect(focus("AXTextField", secure: true).isTextInput)
        expect(focus("AXTextArea").isTextInput, "Terminal exposes a text area with no settable value")
        expect(focus("AXWebArea", editable: true, caret: true).isTextInput)
        expect(!focus("AXButton").isTextInput)
        expect(!focus("AXList").isTextInput)
    }

    test("a selection in text that the user only reads is not text input") {
        expect(!focus("AXWebArea", caret: true).isTextInput, "a web page that the user reads")
        expect(!focus("AXStaticText", caret: true).isTextInput)
    }

    test("the Finder desktop is not text input, though it reports a caret") {
        var desktop = focus("AXGroup", caret: true)
        desktop.subrole = "AXDesktop"
        expect(!desktop.isTextInput)
    }

    test("in Type mode the bar shows only for text input or an echo") {
        func wants(_ field: FocusedField?, echo: String = "", isPrivate: Bool = false) -> Bool {
            InputBarVisibility.wantsBar(
                mode: .type, focusedField: field, isFieldPrivate: isPrivate, input: .local(text: echo),
                isWriteInFront: false)
        }
        expect(!wants(nil))
        expect(!wants(focus("AXButton")))
        expect(wants(focus("AXTextField", editable: true)))
        expect(wants(focus("AXTextField", secure: true)), "a password field shows its notice")
        expect(wants(nil, isPrivate: true), "a field with private text shows its notice")
        expect(wants(nil, echo: "hi"), "an app with no readable field shows the echo")
        expect(!wants(focus("AXList"), echo: "hi"), "the echo hides when the focus is on a list")
    }

    test("Talk mode and the Write window always show the bar") {
        expect(
            InputBarVisibility.wantsBar(
                mode: .talk, focusedField: nil, isFieldPrivate: false, input: .local(text: ""),
                isWriteInFront: false))
        expect(
            InputBarVisibility.wantsBar(
                mode: .type, focusedField: nil, isFieldPrivate: false, input: .local(text: ""),
                isWriteInFront: true))
    }

    test("the bar hides after the delay and shows at once") {
        let clock = FakeClock()
        let bar = InputBarVisibility(scheduler: clock, hideDelay: 0.25)
        bar.update(true)
        expect(bar.isVisible)
        bar.update(false)
        clock.advance(to: 0.125)
        expect(bar.isVisible, "a short focus gap does not hide the bar")
        clock.advance(to: 0.25)
        expect(!bar.isVisible)
        bar.update(true)
        expect(bar.isVisible, "the bar shows at once")
    }

    test("focus that comes back before the delay keeps the bar") {
        let clock = FakeClock()
        let bar = InputBarVisibility(scheduler: clock, hideDelay: 0.25)
        bar.update(true)
        bar.update(false)
        clock.advance(to: 0.125)
        bar.update(true)
        clock.advance(to: 1)
        expect(bar.isVisible)
    }
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

    test("Text sits at the right of the keys, and System and My Panel at the left") {
        let frames = PanelPlacement.defaultFrames(
            keys: keys, sizes: [.text: panel, .system: panel, .mine: panel])
        let gap = Metrics.Detached.gap
        expectEqual(frames[.text]?.minX, keys.maxX + gap)
        expectEqual(frames[.system]?.maxX, keys.minX - gap)
        expectEqual(frames[.mine]?.maxX, keys.minX - gap * 2 - panel.width)
        expectEqual(frames[.text]?.maxY, keys.maxY)
        expectEqual(frames[.mine]?.maxY, keys.maxY)
    }

    test("the Rectangle panel sits at the right of Text") {
        let frames = PanelPlacement.defaultFrames(
            keys: keys, sizes: [.text: panel, .rectangle: panel])
        let gap = Metrics.Detached.gap
        expectEqual(frames[.rectangle]?.minX, keys.maxX + gap * 2 + panel.width)
        expectEqual(frames[.rectangle]?.maxY, keys.maxY)
    }

    test("the Rectangle panel shows only when Rectangle is installed") {
        expect(DetachedPanel.shown(rectangleInstalled: true).contains(.rectangle))
        expect(!DetachedPanel.shown(rectangleInstalled: false).contains(.rectangle))
        expectEqual(Set(DetachedPanel.shown(rectangleInstalled: false)), [.text, .system, .mine])
    }

    test("the shortcut panels show in Type mode and hide in Talk mode") {
        expect(DetachedPanel.isShown(in: .type))
        expect(!DetachedPanel.isShown(in: .talk))
    }

    test("arranging puts the panels around the keys where the keyboard is now") {
        let moved = keys.offsetBy(dx: -400, dy: 300)
        let sizes: [DetachedPanel: CGSize] = [.text: panel, .system: panel, .mine: panel]
        let frames = PanelPlacement.arrangedFrames(keys: moved, sizes: sizes, screen: screen)
        expectEqual(frames, PanelPlacement.defaultFrames(keys: moved, sizes: sizes))
    }

    test("arranging keeps every panel on the screen") {
        let sizes: [DetachedPanel: CGSize] = [.text: panel, .system: panel, .mine: panel]
        let atRight = CGRect(x: 1900, y: 1300, width: 1000, height: 400)
        let right = PanelPlacement.arrangedFrames(keys: atRight, sizes: sizes, screen: screen)
        for frame in right.values { expect(screen.contains(frame), "\(frame) is off the screen") }
        let atLeft = CGRect(x: 50, y: 24, width: 1000, height: 400)
        let left = PanelPlacement.arrangedFrames(keys: atLeft, sizes: sizes, screen: screen)
        for frame in left.values { expect(screen.contains(frame), "\(frame) is off the screen") }
    }

    test("the group of keys and panels is centred on the screen") {
        let origin = PanelPlacement.keysOrigin(
            keysSize: keys.size, panels: [.text: panel, .system: panel, .mine: panel],
            in: screen, rightInset: 0, margin: 24)
        let group = panel.width * 3 + Metrics.Detached.gap * 3 + keys.width
        expectEqual(origin.x, (screen.width - group) / 2 + (panel.width + Metrics.Detached.gap) * 2)
        expectEqual(origin.y, 24)
    }

    test("a saved frame on no screen gives way to the default") {
        let saved = CGRect(x: 9000, y: 9000, width: 174, height: 340)
        expect(!PanelPlacement.isVisible(saved, on: [screen]))
        expect(PanelPlacement.isVisible(CGRect(x: 100, y: 100, width: 174, height: 340), on: [screen]))
    }

    test("the keyboard window keeps the place where the user put it") {
        let suite = "september-test-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { removeDefaults(suite) }
        let position = KeyboardPosition(defaults: defaults)
        expectEqual(position.saved, nil)
        position.saved = CGPoint(x: 300, y: 200)
        expectEqual(KeyboardPosition(defaults: defaults).saved, CGPoint(x: 300, y: 200))
    }

    test("a saved place on no screen gives way to the default place") {
        let size = CGSize(width: 1300, height: 600)
        let fallback = CGPoint(x: 10, y: 24)
        expectEqual(
            KeyboardPosition.origin(saved: CGPoint(x: 300, y: 200), size: size, screens: [screen], fallback: fallback),
            CGPoint(x: 300, y: 200))
        expectEqual(
            KeyboardPosition.origin(saved: CGPoint(x: 9000, y: 200), size: size, screens: [screen], fallback: fallback),
            fallback)
        expectEqual(KeyboardPosition.origin(saved: nil, size: size, screens: [screen], fallback: fallback), fallback)
    }

    test("the keyboard keeps one place in both modes") {
        let talk = CGPoint(x: 100, y: 50)
        let type = KeyboardPosition.typeOrigin(of: talk, in: .talk)
        expectEqual(type.x, talk.x + Metrics.Screen.keysInset(.talk) - Metrics.Screen.keysInset(.type))
        expectEqual(KeyboardPosition.windowOrigin(type, in: .talk), talk)
        expectEqual(KeyboardPosition.typeOrigin(of: talk, in: .type), talk)
    }

    test("the clipboard buttons fit at the left of the bar, and the keys stay in place in both modes") {
        let reach = Metrics.Clipboard.buttonsWidth + Metrics.TopRow.spacing
        for mode in [KeyboardMode.type, .talk] {
            expect(Metrics.Screen.keysInset(mode) >= reach, "no room for the buttons in \(mode)")
        }
        let window = CGPoint(x: 100, y: 50)
        let keys = KeyboardPosition.keysOrigin(ofWindow: window, in: .type)
        expectEqual(keys.x, window.x + Metrics.Screen.cardInset(.type))
        expectEqual(keys.y, window.y)
        let talk = KeyboardPosition.windowOrigin(window, in: .talk)
        expectEqual(KeyboardPosition.keysOrigin(ofWindow: talk, in: .talk), keys)
        expectEqual(KeyboardPosition.typeWindowOrigin(forKeys: keys), window)
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
    let clock: FakeClock
    let completer: CupCompleter
    let pasteboard: MemoryPasteboard
    let clipboard: ClipboardHistory
    let history: SentenceHistory
    let database: KeyboardDatabase
}

@MainActor
private func makeSession(
    userPanel: Result<UserPanelStore, any Error>? = nil,
    voiceHolds: Bool = false,
    predictor: any SentencePredicting = SilentPredictor(),
    pasteboard: MemoryPasteboard = MemoryPasteboard()
) throws -> SessionParts {
    let (controller, sink) = try makeController()
    let defaults = UserDefaults(suiteName: "kit-integration-\(UUID().uuidString)")!
    let voice = FakeEngine()
    voice.holds = voiceHolds
    let speaker = Speaker(
        settings: VoiceSettingsStore(defaults: defaults), system: voice, elevenLabs: FakeEngine())
    let completer = CupCompleter()
    let database = try KeyboardDatabase(path: ":memory:")
    let history = SentenceHistory(database: database, defaults: defaults)
    let engine = PredictionEngine(
        predictor: predictor, completer: completer, delay: .milliseconds(5),
        defaults: defaults, history: history)
    let store =
        userPanel
        ?? Result {
            try UserPanelStore(defaults: defaults, privateTexts: MemoryPrivateTexts())
        }
    let clock = FakeClock()
    let clipboard = ClipboardHistory(defaults: defaults)
    let session = KeyboardSession(
        controller: controller, predictions: engine, speaker: speaker, userPanel: store,
        userPanelUsage: UsageStore(),
        inputBar: InputBarVisibility(scheduler: clock, hideDelay: 0.25),
        clipboard: clipboard, pasteboard: pasteboard, scheduler: clock)
    return SessionParts(
        session: session, controller: controller, sink: sink, voice: voice,
        userPanel: try? store.get(), clock: clock, completer: completer,
        pasteboard: pasteboard, clipboard: clipboard, history: history,
        database: database)
}

private struct SilentPredictor: SentencePredicting {
    var availability: PredictionAvailability { .ready }
    func predictions(for context: PredictionContext) async throws -> [String] { [] }
}

private actor RecordingPredictor: SentencePredicting {
    nonisolated var availability: PredictionAvailability { .ready }
    private(set) var requests: [PredictionContext] = []

    func predictions(for context: PredictionContext) async throws -> [String] {
        requests.append(context)
        return []
    }
}

@MainActor
private final class CupCompleter: WordCompleting {
    private(set) var responses: [String] = []

    func completions(for context: PredictionContext) -> [WordCompletion] {
        WordCompletion(word: "cup", partial: context.partialWord).map { [$0] } ?? []
    }

    func record(_ response: WordResponse, to completion: WordCompletion) {
        responses.append("\(response) \(completion.word)")
    }
}

/// The focus comes to an empty field, and then the user types `text` in it.
@MainActor
private func userTypes(_ text: String, in parts: SessionParts) async throws {
    parts.controller.focusChanged(to: field("", caret: 0))
    await parts.session.settle()
    parts.controller.focusChanged(to: field(text, caret: text.utf16.count))
    await parts.session.settle()
}

@MainActor
private func shortcutTests() async {
    let copy = AppShortcut(name: "Copy", shortcut: Shortcut(modifiers: .command, key: .character("c")))
    let lock = AppShortcut(
        name: "Lock Notes", shortcut: Shortcut(modifiers: [.control, .option], key: .character("l")))
    let commandKey = KeyboardLayout.rows.flatMap(\.keys).first { $0.id == "command-left" }!

    func makeParts() throws -> SessionParts {
        let parts = try makeSession()
        parts.session.readMenu = { [copy, lock] }
        return parts
    }

    await asyncTest("with no text field in focus, the place of the bar shows the shortcuts of the menu") {
        let parts = try makeParts()
        parts.controller.focusChanged(to: focus("AXButton"))
        await parts.session.settle()
        expectEqual(parts.session.shortcuts, [copy, lock])
    }

    await asyncTest("a text field shows the predictions, not the shortcuts") {
        let parts = try makeParts()
        parts.controller.focusChanged(to: field("Hi", caret: 2))
        await parts.session.settle()
        expect(parts.session.shortcuts.isEmpty)
    }

    await asyncTest("a latched Command shows the Command shortcuts, and a press presses the chord and ends the latch") {
        let parts = try makeParts()
        parts.controller.focusChanged(to: field("Hi", caret: 2))
        parts.controller.press(commandKey)
        await parts.session.settle()
        let shortcuts = parts.session.shortcuts
        expect(!shortcuts.isEmpty)
        expect(shortcuts.allSatisfy { $0.shortcut.modifiers.contains(.command) })
        expect(!shortcuts.contains(lock))

        let posted = parts.sink.posted.count
        parts.session.pressShortcut(copy)
        await parts.session.settle()
        expect(parts.sink.posted.count > posted, "the chord goes to the app")
        expect(parts.controller.modifiers.active.isEmpty)
        expect(parts.session.shortcuts.isEmpty)
    }

    await asyncTest("Talk mode shows no shortcuts") {
        let parts = try makeParts()
        parts.controller.mode = .talk
        parts.controller.press(commandKey)
        await parts.session.settle()
        expect(parts.session.shortcuts.isEmpty)
    }

    await asyncTest("a held Command on the hardware keyboard shows the shortcuts after the hold delay") {
        let parts = try makeParts()
        parts.controller.focusChanged(to: field("Hi", caret: 2))
        parts.controller.macModifiersChanged(.command)
        await parts.session.settle()
        expect(parts.session.shortcuts.isEmpty, "a quick chord does not make the stack blink")
        parts.clock.advance(to: KeyboardSession.modifierHoldDelay)
        await parts.session.settle()
        expect(parts.session.shortcuts.contains(copy))
        parts.controller.macModifiersChanged([])
        await parts.session.settle()
        expect(parts.session.shortcuts.isEmpty, "the release hides the shortcuts at once")
    }

    await asyncTest("a quick hardware chord shows no shortcuts") {
        let parts = try makeParts()
        parts.controller.focusChanged(to: field("Hi", caret: 2))
        parts.controller.macModifiersChanged(.command)
        parts.controller.macModifiersChanged([])
        parts.clock.advance(to: 1)
        await parts.session.settle()
        expect(parts.session.shortcuts.isEmpty)
    }

    await asyncTest("the keyboard reads the menu bar one time for each app") {
        let parts = try makeSession()
        var reads = 0
        parts.session.readMenu = {
            reads += 1
            return [copy]
        }
        parts.controller.focusChanged(to: focus("AXButton"))
        await parts.session.settle()
        parts.controller.focusChanged(to: focus("AXGroup"))
        await parts.session.settle()
        expectEqual(reads, 1)
        parts.session.appChanged(name: "Notes", bundleID: "com.apple.Notes")
        await parts.session.settle()
        expectEqual(reads, 2)
    }
}

@MainActor
private func sessionTests() async {
    await asyncTest("the session shows the bar for a text field and hides it after the delay") {
        let parts = try makeSession()
        let bar = parts.session.inputBar
        expect(!bar.isVisible, "nothing has focus at launch")
        parts.controller.focusChanged(to: field("", caret: 0))
        expect(bar.isVisible)
        parts.controller.focusChanged(to: focus("AXButton"))
        expect(bar.isVisible)
        parts.clock.advance(to: 0.25)
        expect(!bar.isVisible)
    }

    await asyncTest("the session shows the echo and hides it when Return empties it") {
        let parts = try makeSession()
        let bar = parts.session.inputBar
        parts.controller.press(KeyboardLayout.rows.flatMap(\.keys).first { $0.id == "key-a" }!)
        expect(bar.isVisible)
        parts.controller.press(KeyboardLayout.rows.flatMap(\.keys).first { $0.id == "return" }!)
        parts.clock.advance(to: 0.25)
        expect(!bar.isVisible)
    }

    await asyncTest("the session shows the bar in Talk mode and in the Write window") {
        let parts = try makeSession()
        let bar = parts.session.inputBar
        parts.controller.mode = .talk
        expect(bar.isVisible)
        parts.controller.mode = .type
        parts.clock.advance(to: 0.25)
        expect(!bar.isVisible)
        parts.session.appChanged(name: "Write", bundleID: WritePanel.id)
        expect(bar.isVisible)
        parts.session.appChanged(name: "Finder", bundleID: "com.apple.finder")
        parts.clock.advance(to: 0.5)
        expect(!bar.isVisible)
    }

    await asyncTest("the input of the controller feeds the word row") {
        let parts = try makeSession()
        parts.controller.focusChanged(to: field("I would like a cu", caret: 17))
        await parts.session.settle()
        expectEqual(parts.session.predictions.words.map(\.word), ["cup"])
    }

    await asyncTest("Return on the keys records the picked word") {
        let parts = try makeSession()
        parts.controller.focusChanged(to: field("I would like a cu", caret: 17))
        await parts.session.settle()
        parts.session.pickWord(parts.session.predictions.words[0])
        expectEqual(parts.sink.typed, ["p "])
        parts.controller.focusChanged(to: field("I would like a cup ", caret: 19))
        await parts.session.settle()
        parts.controller.press(KeyboardLayout.rows.flatMap(\.keys).first { $0.id == "return" }!)
        expectEqual(parts.completer.responses, ["accepted cup"])
    }

    await asyncTest("Return on the keys keeps the sentences of the field, and the Write window keeps none") {
        let parts = try makeSession()
        let returnKey = KeyboardLayout.rows.flatMap(\.keys).first { $0.id == "return" }!
        try await userTypes("See you soon.", in: parts)
        parts.controller.press(returnKey)
        expectEqual(parts.history.matches(for: "See"), ["See you soon."])

        parts.session.appChanged(name: "Write", bundleID: WritePanel.id)
        try await userTypes("My diary.", in: parts)
        parts.controller.press(returnKey)
        expectEqual(parts.history.count, 1)
    }

    await asyncTest("the history rows of a typed field reach the stack") {
        let parts = try makeSession()
        parts.history.record("See you soon.")
        try await userTypes("See y", in: parts)
        expectEqual(parts.session.predictions.stripes.map(\.prediction), ["See you soon."])
    }

    await asyncTest("Speak in Talk mode records the picked word") {
        let parts = try makeSession()
        parts.controller.mode = .talk
        parts.controller.talk.type("a cu")
        await parts.session.settle()
        parts.session.pickWord(parts.session.predictions.words[0])
        await parts.session.settle()
        parts.session.speakPressed()
        expectEqual(parts.completer.responses, ["accepted cup"])
    }

    await asyncTest("Speak in Talk mode keeps each sentence of the line in the sentence table") {
        let parts = try makeSession()
        parts.controller.mode = .talk
        parts.controller.talk.type("I am thirsty. Can I have some water?")
        await parts.session.settle()
        parts.session.speakPressed()
        let rows = try parts.database.query("SELECT text, uses FROM sentence ORDER BY id")
        expectEqual(rows.map { $0[0].text }, ["I am thirsty.", "Can I have some water?"])
        expectEqual(rows.map { $0[1].int }, [1, 1])
        expectEqual(parts.history.count, 2)
    }

    await asyncTest("a new field forgets the picked words") {
        let parts = try makeSession()
        parts.controller.focusChanged(to: field("I would like a cu", caret: 17))
        await parts.session.settle()
        parts.session.pickWord(parts.session.predictions.words[0])
        parts.session.focusMoved()
        parts.controller.press(KeyboardLayout.rows.flatMap(\.keys).first { $0.id == "return" }!)
        expectEqual(parts.completer.responses, [])
    }

    await asyncTest("the text on screen reaches the predictions in Type mode with the switch on") {
        let predictor = RecordingPredictor()
        let parts = try makeSession(predictor: predictor)
        parts.session.appChanged(name: "WhatsApp", bundleID: "net.whatsapp.WhatsApp")
        try await userTypes("Yes", in: parts)
        let screen = ScreenContext(
            bundleID: "net.whatsapp.WhatsApp", appName: "WhatsApp", title: nil, field: nil, lines: ["Lunch?"])
        parts.session.screenRead(screen)
        await parts.session.settle()
        var last = await predictor.requests.last
        expect(last != nil && last?.screen == nil, "the switch is off")

        parts.session.predictions.screenEnabled = true
        await parts.session.settle()
        last = await predictor.requests.last
        expectEqual(last?.screen, screen)

        parts.controller.mode = .talk
        await parts.session.settle()
        parts.controller.talk.type("Hi")
        await parts.session.settle()
        last = await predictor.requests.last
        expect(last?.screen == nil, "Talk mode sends no text from the screen")
    }

    await asyncTest("Type mode sends no Talk history, and Talk mode sends the last hour") {
        let predictor = RecordingPredictor()
        let parts = try makeSession(predictor: predictor)
        let said = parts.controller.talk.said
        said.add("Yesterday", at: Date().addingTimeInterval(-24 * 3600))
        said.add("Good morning", at: Date())
        try await userTypes("Hi", in: parts)
        var last = await predictor.requests.last
        expectEqual(last?.said, [])

        parts.controller.mode = .talk
        await parts.session.settle()
        parts.controller.talk.type("Hi")
        await parts.session.settle()
        last = await predictor.requests.last
        expectEqual(last?.said, ["Good morning"])
    }

    await asyncTest("a read from another app is dropped, and a new app clears the screen") {
        let predictor = RecordingPredictor()
        let parts = try makeSession(predictor: predictor)
        parts.session.predictions.screenEnabled = true
        parts.session.appChanged(name: "WhatsApp", bundleID: "net.whatsapp.WhatsApp")
        try await userTypes("Yes", in: parts)
        parts.session.screenRead(
            ScreenContext(bundleID: "net.whatsapp.WhatsApp", appName: "WhatsApp", title: nil, field: nil, lines: ["Lunch?"]))
        await parts.session.settle()
        parts.session.appChanged(name: "Notes", bundleID: "com.apple.Notes")
        try await userTypes("Ye", in: parts)
        parts.session.screenRead(
            ScreenContext(bundleID: "net.whatsapp.WhatsApp", appName: "WhatsApp", title: nil, field: nil, lines: ["Late"]))
        await parts.session.settle()
        let last = await predictor.requests.last
        expect(last != nil && last?.screen == nil)
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

    await asyncTest("Speak in the Write window reads the document without its marks") {
        let parts = try makeSession(voiceHolds: true)
        parts.session.writeSpeech = { EditorSpeech(selection: "", markdown: "# Plan\n\nSee **the roses**.") }
        parts.session.appChanged(name: "Write", bundleID: WritePanel.id)
        parts.session.writeCaretRead(EditorCaret(text: "", caret: 0, length: 0, documentIsEmpty: false))
        await parts.session.settle()
        expectEqual(parts.session.speakMode, .speak, "an empty paragraph at the caret leaves Speak on")
        expectEqual(parts.controller.input, .mirrored(text: "", caret: 0, selectionLength: 0))
        parts.session.speakPressed()
        await parts.session.settle()
        expectEqual(parts.voice.spoken, ["Plan.\n\nSee the roses."])
        expectEqual(parts.session.speakMode, .stop)
        expectEqual(parts.session.spokenWord, nil, "the bar does not hold the document")
    }

    await asyncTest("Speak in the Write window is off while the document has no text") {
        let parts = try makeSession()
        parts.session.appChanged(name: "Write", bundleID: WritePanel.id)
        parts.session.writeCaretRead(EditorCaret(text: "", caret: 0, length: 0, documentIsEmpty: true))
        await parts.session.settle()
        expectEqual(parts.session.speakMode, .off)
        parts.session.writeCaretRead(EditorCaret(text: "Hi", caret: 2, length: 0, documentIsEmpty: false))
        await parts.session.settle()
        expectEqual(parts.session.speakMode, .speak)
    }

    await asyncTest("Speak in the Write window reads the selection") {
        let parts = try makeSession()
        parts.session.writeSpeech = { EditorSpeech(selection: "the roses", markdown: "See **the roses**.") }
        parts.session.appChanged(name: "Write", bundleID: WritePanel.id)
        parts.session.writeCaretRead(EditorCaret(text: "See the roses.", caret: 4, length: 9, documentIsEmpty: false))
        parts.session.speakPressed()
        await parts.session.settle()
        expectEqual(parts.voice.spoken, ["the roses"])
    }

    await asyncTest("Speak in another app reads its field, not the Write document") {
        let parts = try makeSession()
        parts.session.writeSpeech = { EditorSpeech(selection: "", markdown: "The document") }
        parts.session.appChanged(name: "Write", bundleID: WritePanel.id)
        parts.session.appChanged(name: "Messages", bundleID: "com.apple.MobileSMS")
        parts.controller.focusChanged(to: field("Hello", caret: 5))
        await parts.session.settle()
        parts.session.speakPressed()
        await parts.session.settle()
        expectEqual(parts.voice.spoken, ["Hello"])
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

    await asyncTest("the Write window gets the Write panel, and another app gets none") {
        let parts = try makeSession()
        parts.session.appChanged(name: "Write", bundleID: WritePanel.id)
        expectEqual(parts.session.writePanel, parts.controller.panels.write)
        expectEqual(parts.controller.frontmostAppName, "Write")
        parts.session.appChanged(name: "Notes", bundleID: "com.apple.Notes")
        expectEqual(parts.session.writePanel, nil)
    }

    await asyncTest("the desk of Write gets the Documents panel, and Speak reads what Write gives") {
        let parts = try makeSession()
        parts.session.writeSpeech = { EditorSpeech(selection: "Garden Plans", markdown: "") }
        parts.session.appChanged(name: "Write", bundleID: WritePanel.documentsID)
        expectEqual(parts.session.writePanel, parts.controller.panels.writeDocuments)
        parts.session.writeCaretRead(EditorCaret(text: "gar", caret: 3, length: 0))
        await parts.session.settle()
        expectEqual(parts.controller.input, .mirrored(text: "gar", caret: 3, selectionLength: 0))
        parts.session.speakPressed()
        await parts.session.settle()
        expectEqual(parts.voice.spoken, ["Garden Plans"])
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

        parts.session.appChanged(name: "Notes", bundleID: "com.apple.Notes")
        expectEqual(parts.session.mineButtons.map(\.name), ["Undo", "Save"])
    }

    await asyncTest("a broken My Panel file shows an error and stays as it is") {
        let file = temporaryDirectory().appendingPathComponent("my-panel.json")
        try FileManager.default.createDirectory(
            at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data("{ not json".utf8).write(to: file)
        let parts = try makeSession(
            userPanel: Result {
                try UserPanelStore(
                    importing: file, defaults: UserDefaults(suiteName: "kit-broken-\(UUID().uuidString)")!,
                    privateTexts: MemoryPrivateTexts())
            })
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
}

struct MissingValue: Error {}

func expectValue<T>(_ value: T?) throws -> T {
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

// MARK: - The height of the panels

/// The height that a view asks for, as the app measures a panel window.
@MainActor
private func height(_ view: some View, controller: KeyboardController) -> CGFloat {
    let probe = NSHostingView(rootView: view.environmentObject(controller))
    probe.layoutSubtreeIfNeeded()
    return probe.fittingSize.height
}

@MainActor
private func panelHeightTests() async {
    await asyncTest("the Text keypad, the Write panels, and Mine are as tall as the System keypad") {
        let parts = try makeSession()
        let controller = parts.controller
        let system = height(KeypadCard(panel: controller.panels.system), controller: controller)
        expectEqual(height(KeypadCard(panel: controller.panels.text), controller: controller), system, "Text")
        let card = MyPanelCard(session: parts.session)
        for bundleID in [WritePanel.id, WritePanel.documentsID] {
            parts.session.appChanged(name: "Write", bundleID: bundleID)
            expectEqual(height(card, controller: controller), system, bundleID)
        }
        parts.session.appChanged(name: "Notes", bundleID: "com.apple.Notes")
        expectEqual(height(card, controller: controller), system, "an empty Mine")
        let store = try expectValue(parts.userPanel)
        for index in 0..<14 {
            try store.add(NewButton(
                name: "Key \(index)", action: .shortcut(Shortcut(modifiers: .command, key: .character("k")))))
        }
        try store.add(NewButton(name: "Hello", action: .text("Hello")))
        await parts.session.settle()
        expectEqual(height(card, controller: controller), system, "a full Mine")
    }
}

// MARK: - Bringing a window to the front

@MainActor
private final class FakeApp: ActivatingApp {
    var isActive = false
    /// True when macOS grants the activation at once.
    var grants = false
    var requests = 0

    func activate() {
        requests += 1
        if grants { isActive = true }
    }
}

@MainActor
private final class FakeWindow: FocusWindow {
    var events: [String] = []

    func orderFrontRegardless() { events.append("front") }
    func makeKeyAndOrderFront(_ sender: Any?) { events.append("key") }
}

@MainActor
private func activationTests() {
    test("an active app gives the window the focus at once") {
        let app = FakeApp()
        app.grants = true
        let window = FakeWindow()
        WindowActivation(app: app).bringToFront(window)
        expectEqual(app.requests, 1)
        expectEqual(window.events, ["key"])
    }

    test("a refused activation shows the window on top, and the focus follows the activation") {
        let app = FakeApp()
        let activation = WindowActivation(app: app)
        let window = FakeWindow()
        activation.bringToFront(window)
        expectEqual(app.requests, 1)
        expectEqual(window.events, ["front"])
        activation.appBecameActive(keyWindow: nil)
        expectEqual(window.events, ["front", "key"])
        activation.appBecameActive(keyWindow: nil)
        expectEqual(window.events, ["front", "key"], "the focus goes to the window once")
    }

    test("a window that the user chose keeps the focus") {
        let activation = WindowActivation(app: FakeApp())
        let write = FakeWindow()
        let settings = FakeWindow()
        activation.bringToFront(write)
        activation.appBecameActive(keyWindow: settings)
        expectEqual(write.events, ["front"])
    }

    test("a closed window does not take the focus") {
        let activation = WindowActivation(app: FakeApp())
        let window = FakeWindow()
        activation.bringToFront(window)
        activation.windowClosed(window)
        activation.appBecameActive(keyWindow: nil)
        expectEqual(window.events, ["front"])
    }
}

// MARK: - The clipboard

@MainActor
private func clipboardSessionTests() async {
    let command = Modifiers.command
    let commandKey: UInt16 = 55
    /// The keys of the chords that the sink got, without the Command key.
    func chordKeys(_ sink: RecordingSink) -> [UInt16] {
        sink.downs.map(\.key).filter { $0 != commandKey }
    }

    await asyncTest("History opens in the place of the predictions and a second press closes it") {
        let parts = try makeSession()
        expect(!parts.session.isHistoryOpen)
        parts.session.toggleHistory()
        expect(parts.session.isHistoryOpen)
        parts.session.toggleHistory()
        expect(!parts.session.isHistoryOpen)
    }

    await asyncTest("a copied text in Type mode goes on the clipboard and is pasted with Command-V") {
        let parts = try makeSession()
        parts.clipboard.add("Ward 7, bed 12")
        parts.clipboard.add("14 Elm Road")
        parts.session.toggleHistory()
        parts.sink.reset()
        let ward = try expectValue(parts.clipboard.items.last)
        parts.session.pasteClip(ward)
        expectEqual(parts.pasteboard.string(), "Ward 7, bed 12")
        expectEqual(chordKeys(parts.sink), [9])
        expectEqual(parts.sink.downs.last?.flags, command)
        expectEqual(parts.clipboard.items.map(\.text), ["Ward 7, bed 12", "14 Elm Road"])
        expect(!parts.session.isHistoryOpen, "a paste closes the history")
    }

    await asyncTest("a copied text in Talk mode goes into the Talk bar") {
        let parts = try makeSession()
        parts.controller.mode = .talk
        parts.controller.talk.type("The address is ")
        parts.clipboard.add("14 Elm Road")
        parts.session.toggleHistory()
        parts.sink.reset()
        parts.session.pasteClip(try expectValue(parts.clipboard.items.first))
        expectEqual(parts.controller.talk.text, "The address is 14 Elm Road")
        expect(parts.sink.posted.isEmpty, "Talk mode sends no events to the app in front")
        expect(!parts.session.isHistoryOpen)
    }

    await asyncTest("Cut, Copy, and Paste press Command-X, Command-C, and Command-V in Type mode") {
        let parts = try makeSession()
        parts.session.cut()
        parts.session.copy()
        parts.session.paste()
        expectEqual(chordKeys(parts.sink), [7, 8, 9])
        expect(parts.sink.downs.filter { $0.key != commandKey }.allSatisfy { $0.flags == command })
    }

    await asyncTest("in Talk mode Copy copies the Talk text, Cut also clears it, and Paste types the clipboard") {
        let parts = try makeSession()
        parts.controller.mode = .talk
        parts.controller.talk.type("Good morning")
        parts.session.copy()
        expectEqual(parts.pasteboard.string(), "Good morning")
        expectEqual(parts.controller.talk.text, "Good morning")
        parts.controller.talk.type(", nurse")
        parts.session.cut()
        expectEqual(parts.pasteboard.string(), "Good morning, nurse")
        expectEqual(parts.controller.talk.text, "")
        parts.session.paste()
        parts.session.paste()
        expectEqual(parts.controller.talk.text, "Good morning, nurseGood morning, nurse")
        expect(parts.sink.posted.isEmpty)
    }

    await asyncTest("Cut and Copy are on only for a selection, an echo, or Talk text") {
        let parts = try makeSession()
        let session = parts.session
        parts.controller.focusChanged(to: field("I am on the train", caret: 8))
        await session.settle()
        expect(!session.canCutOrCopy, "a caret with no selection")
        parts.controller.focusChanged(to: field("I am on the train", caret: 8, selection: 9))
        await session.settle()
        expect(session.canCutOrCopy, "a selection")
        parts.controller.focusChanged(to: nil)
        await session.settle()
        expect(session.canCutOrCopy, "the app shows no field, so the keyboard cannot tell")
        parts.controller.focusChanged(
            to: FocusedField(
                appName: "Safari", role: "AXTextField", isEditable: true, isSecure: true, text: nil,
                selection: nil))
        await session.settle()
        expect(!session.canCutOrCopy, "a password field")
        parts.controller.mode = .talk
        await session.settle()
        expect(!session.canCutOrCopy, "an empty Talk bar")
        parts.controller.talk.type("Hello")
        await session.settle()
        expect(session.canCutOrCopy)
    }

    await asyncTest("Paste is on only when the clipboard holds text") {
        let pasteboard = MemoryPasteboard()
        let parts = try makeSession(pasteboard: pasteboard)
        expect(!parts.session.canPaste)
        pasteboard.copy("Hello")
        parts.session.pasteboardChanged()
        expect(parts.session.canPaste)
        pasteboard.copy(nil, types: ["public.png"])
        parts.session.pasteboardChanged()
        expect(!parts.session.canPaste)
    }

    await asyncTest("an app change and a mode change close the history") {
        let parts = try makeSession()
        parts.session.toggleHistory()
        parts.session.appChanged(name: "Mail", bundleID: "com.apple.mail")
        expect(!parts.session.isHistoryOpen)
        parts.session.toggleHistory()
        parts.controller.mode = .talk
        await parts.session.settle()
        expect(!parts.session.isHistoryOpen)
    }

    await asyncTest("the history turns its pages and starts on the newest page when it opens") {
        let parts = try makeSession()
        for index in 0..<13 { parts.clipboard.add("Text \(index)") }
        parts.session.toggleHistory()
        expectEqual(parts.session.historyPage, 0)
        parts.session.newerPage()
        expectEqual(parts.session.historyPage, 0)
        parts.session.olderPage()
        parts.session.olderPage()
        parts.session.olderPage()
        expectEqual(parts.session.historyPage, 2)
        parts.session.toggleHistory()
        parts.session.toggleHistory()
        expectEqual(parts.session.historyPage, 0)
    }
}
