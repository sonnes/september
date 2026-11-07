import AppKit
import Foundation
import SeptemberKit
import SwiftUI

/// Records what Talk mode asks the voice to say.
@MainActor
private final class SpeechSpy: SpeechOutput {
    var spoken: [String] = []
    var stops = 0

    func speak(_ text: String) { spoken.append(text) }
    func stop() { stops += 1 }
}

private func layoutKey(_ id: String) -> KeyDefinition {
    for row in KeyboardLayout.rows {
        if let match = row.keys.first(where: { $0.id == id }) { return match }
    }
    fatalError("no key \(id)")
}

/// A controller in Talk mode with a speech spy attached.
@MainActor
private func makeTalkController() throws -> (KeyboardController, RecordingSink, SpeechSpy) {
    let (controller, sink) = try makeController()
    let spy = SpeechSpy()
    controller.talk.speech = spy
    controller.mode = .talk
    return (controller, sink, spy)
}

@MainActor
private func type(_ ids: [String], into controller: KeyboardController) {
    for id in ids { controller.press(layoutKey(id)) }
}

@MainActor
private func makeDefaults() -> UserDefaults {
    let name = "SettingsTalkTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: name)!
    defaults.removePersistentDomain(forName: name)
    return defaults
}

@MainActor
func settingsTalkTests() {
    // MARK: Talk mode keys

    test("talk mode types into the bar and sends nothing to the app in front") {
        let (controller, sink, _) = try makeTalkController()
        type(["key-a", "key-s"], into: controller)
        expectEqual(controller.talk.text, "as")
        expect(sink.posted.isEmpty, "talk mode posted key events")
        expect(sink.typed.isEmpty, "talk mode typed text")
    }

    test("talk mode honours shift, caps lock and the secondary glyph") {
        let (controller, _, _) = try makeTalkController()
        type(["shift-left", "key-a", "key-s", "shift-left", "key-1"], into: controller)
        expectEqual(controller.talk.text, "As!")
        type(["capslock", "key-a"], into: controller)
        expectEqual(controller.talk.text, "As!A")
    }

    test("talk mode edits the bar with space and delete") {
        let (controller, _, _) = try makeTalkController()
        type(["key-a", "space", "key-s", "delete"], into: controller)
        expectEqual(controller.talk.text, "a ")
    }

    test("a chord in talk mode does nothing and uses up the modifier") {
        let (controller, sink, _) = try makeTalkController()
        type(["command-left", "key-c"], into: controller)
        expect(sink.posted.isEmpty)
        expectEqual(controller.talk.text, "")
        expectEqual(controller.modifiers.active, [])
    }

    test("type mode posts keys again after talk mode") {
        let (controller, sink, _) = try makeTalkController()
        type(["key-a"], into: controller)
        controller.mode = .type
        type(["key-s"], into: controller)
        expectEqual(sink.downs.map(\.key), [1])
        expectEqual(controller.talk.text, "a")
    }

    // MARK: Speaking the bar

    test("return speaks the bar and adds it to the Said list") {
        let (controller, _, spy) = try makeTalkController()
        type(["key-a", "key-s", "return"], into: controller)
        expectEqual(spy.spoken, ["as"])
        expectEqual(controller.talk.said.lines.map(\.text), ["as"])
        expectEqual(controller.talk.said.currentID, controller.talk.said.lines.first?.id)
        expectEqual(controller.talk.text, "as", "the bar holds the text during speech")
        controller.talk.speechEnded()
        expectEqual(controller.talk.text, "", "the bar is empty after speech")
    }

    test("return does not speak when the setting is off") {
        let (controller, _, spy) = try makeTalkController()
        controller.talk.returnSpeaks = false
        type(["key-a", "return"], into: controller)
        expect(spy.spoken.isEmpty)
        expectEqual(controller.talk.text, "a")
        expect(controller.talk.said.lines.isEmpty)
    }

    test("an empty bar speaks nothing") {
        let (controller, _, spy) = try makeTalkController()
        type(["space", "return"], into: controller)
        expect(spy.spoken.isEmpty)
        expect(controller.talk.said.lines.isEmpty)
    }

    test("stop ends the speech and keeps the text in the bar") {
        let (controller, _, spy) = try makeTalkController()
        type(["key-a", "return"], into: controller)
        controller.talk.stop()
        controller.talk.speechEnded()
        expectEqual(spy.stops, 1)
        expectEqual(controller.talk.text, "a")
    }

    test("text typed during speech stays in the bar") {
        let (controller, _, _) = try makeTalkController()
        type(["key-a", "return", "key-s"], into: controller)
        controller.talk.speechEnded()
        expectEqual(controller.talk.text, "as")
    }

    // MARK: Phrases and panels in Talk mode

    test("a phrase goes into the bar after a space") {
        let (controller, sink, _) = try makeTalkController()
        controller.perform(.text("Yes"))
        expectEqual(controller.talk.text, "Yes")
        controller.perform(.text("Thanks"))
        expectEqual(controller.talk.text, "Yes Thanks")
        type(["space"], into: controller)
        controller.perform(.text("Bye"))
        expectEqual(controller.talk.text, "Yes Thanks Bye")
        expect(sink.typed.isEmpty)
    }

    test("a shortcut in talk mode sends nothing") {
        let (controller, sink, _) = try makeTalkController()
        controller.perform(.shortcut(Shortcut(modifiers: .command, key: .character("c"))))
        expect(sink.posted.isEmpty)
    }

    test("each phrase types its own label") {
        let panel = try Phrases.bundled()
        expectEqual(panel.buttons.count, 12)
        expect(panel.buttons.allSatisfy { $0.action == .text($0.label) }, "each phrase types its label")
    }

    // MARK: Said list

    test("the Said list is newest first and a replay does not reorder it") {
        let (controller, _, spy) = try makeTalkController()
        let said = controller.talk.said
        type(["key-a", "return"], into: controller)
        controller.talk.speechEnded()
        type(["key-s", "return"], into: controller)
        controller.talk.speechEnded()
        expectEqual(said.lines.map(\.text), ["s", "a"])

        let old = said.lines[1]
        controller.talk.sayAgain(old)
        expectEqual(spy.spoken, ["a", "s", "a"])
        expectEqual(said.lines.map(\.text), ["s", "a"])
        expectEqual(said.currentID, old.id)
        expectEqual(controller.talk.text, "")
    }

    test("a replay leaves the text in the bar") {
        let (controller, _, _) = try makeTalkController()
        type(["key-a", "return"], into: controller)
        controller.talk.speechEnded()
        type(["key-s"], into: controller)
        controller.talk.sayAgain(controller.talk.said.lines[0])
        controller.talk.speechEnded()
        expectEqual(controller.talk.text, "s")
    }

    test("a Said line gives its age in short form") {
        let start = Date(timeIntervalSinceReferenceDate: 0)
        let line = SaidLine(text: "Hello", date: start)
        expectEqual(line.age(at: start.addingTimeInterval(30)), "now")
        expectEqual(line.age(at: start.addingTimeInterval(125)), "2 min")
        expectEqual(line.age(at: start.addingTimeInterval(3_700)), "1 h")
    }

    test("a Said line never prints its text") {
        let line = SaidLine(text: "my secret", date: Date())
        expect(!String(describing: line).contains("secret"))
        expect(!String(reflecting: line).contains("secret"))
    }

    // MARK: Settings

    test("the sidebar groups match the mock") {
        expectEqual(SettingsGroup.allCases, [.speak, .type, .keyboard])
        expectEqual(
            SettingsGroup.allCases.map(\.pages),
            [[.voice, .speech], [.predictions, .clipboard, .appPanels, .myPanel], [.look, .accessibility]])
        expectEqual(
            Set(SettingsGroup.allCases.flatMap(\.pages)), Set(SettingsPage.allCases),
            "each page is in one group")
    }

    test("settings pages of other tracks are placeholders until set") {
        let settings = KeyboardSettings(defaults: makeDefaults())
        var pages = SettingsPages(
            settings: settings, permission: AccessibilityPermission(isTrusted: false))
        expectEqual(
            SettingsPage.allCases.filter(pages.isPlaceholder),
            [.voice, .speech, .predictions, .clipboard, .appPanels, .myPanel])
        pages[.voice] = AnyView(EmptyView())
        expect(!pages.isPlaceholder(.voice))
    }

    test("keyboard settings start at the defaults") {
        let settings = KeyboardSettings(defaults: makeDefaults())
        expectEqual(settings.style, .rainbow)
        expectEqual(settings.returnSpeaksInTalk, true)
    }

    test("keyboard settings persist in the defaults") {
        let defaults = makeDefaults()
        let first = KeyboardSettings(defaults: defaults)
        first.style = .mono
        first.returnSpeaksInTalk = false
        let second = KeyboardSettings(defaults: defaults)
        expectEqual(second.style, .mono)
        expectEqual(second.returnSpeaksInTalk, false)
    }
}
