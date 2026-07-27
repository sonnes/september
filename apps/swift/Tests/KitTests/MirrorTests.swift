import Foundation
import SeptemberKit

@MainActor
func mirrorTests() {
    func field(
        text: String? = "hello",
        selection: NSRange? = NSRange(location: 5, length: 0),
        role: String = "AXTextArea",
        editable: Bool = true,
        secure: Bool = false
    ) -> FocusedField {
        FocusedField(
            appName: "TextEdit",
            role: role,
            isEditable: editable,
            isSecure: secure,
            text: text,
            selection: selection
        )
    }

    test("a readable field is mirrored with its caret") {
        expectEqual(field().display, .mirrored(text: "hello", caret: 5, selectionLength: 0))
    }

    test("a selection comes through as a length") {
        let selected = field(text: "hello", selection: NSRange(location: 1, length: 3))
        expectEqual(selected.display, .mirrored(text: "hello", caret: 1, selectionLength: 3))
    }

    test("the caret is clamped to the text") {
        let past = field(text: "hi", selection: NSRange(location: 99, length: 4))
        expectEqual(past.display, .mirrored(text: "hi", caret: 2, selectionLength: 0))
    }

    test("a field with no selection puts the caret at the end") {
        expectEqual(field(selection: nil).display, .mirrored(text: "hello", caret: 5, selectionLength: 0))
    }

    test("a secure field is never mirrored") {
        expectEqual(field(text: "", role: "AXTextField", secure: true).display, .secure)
    }

    test("a field the app exposes no text for is not mirrored") {
        expect(field(text: nil).display == nil)
    }

    test("a read-only field is not mirrored") {
        expect(field(editable: false).display == nil)
    }

    test("caret offsets are UTF-16, the same units the accessibility API uses") {
        let emoji = field(text: "🙂ok", selection: NSRange(location: 2, length: 0))
        expectEqual(emoji.display, .mirrored(text: "🙂ok", caret: 2, selectionLength: 0))
        expectEqual(InputMirror.split("🙂ok", caret: 2, selectionLength: 0).before, "🙂")
    }

    test("splitting a mirrored line gives the three runs the bar draws") {
        let parts = InputMirror.split("hello", caret: 1, selectionLength: 3)
        expectEqual(parts.before, "h")
        expectEqual(parts.selected, "ell")
        expectEqual(parts.after, "o")
    }
}

@MainActor
func focusTests() {
    func makeController() -> (KeyboardController, RecordingSink) {
        let sink = RecordingSink()
        return (KeyboardController(sink: sink, store: try! PanelStore.bundled()), sink)
    }

    let editable = FocusedField(
        appName: "TextEdit",
        role: "AXTextArea",
        isEditable: true,
        isSecure: false,
        text: "hello",
        selection: NSRange(location: 5, length: 0)
    )

    test("with nothing focused the bar shows what we typed ourselves") {
        let (controller, _) = makeController()
        controller.focusChanged(to: nil)
        controller.press(KeyDefinition(id: "x", kind: .standard, label: "x", action: .text("x")))
        expectEqual(controller.input, .local(text: "x"))
    }

    test("focusing a readable field mirrors it instead of our echo") {
        let (controller, _) = makeController()
        controller.press(KeyDefinition(id: "x", kind: .standard, label: "x", action: .text("x")))
        controller.focusChanged(to: editable)
        expectEqual(controller.input, .mirrored(text: "hello", caret: 5, selectionLength: 0))
        expectEqual(controller.echo, "", "the local buffer is dropped while mirroring")
    }

    test("the mirror follows the field as it changes") {
        let (controller, _) = makeController()
        controller.focusChanged(to: editable)
        var typed = editable
        typed.text = "hello!"
        typed.selection = NSRange(location: 6, length: 0)
        controller.focusChanged(to: typed)
        expectEqual(controller.input, .mirrored(text: "hello!", caret: 6, selectionLength: 0))
    }

    test("leaving a mirrored field falls back to a fresh local echo") {
        let (controller, _) = makeController()
        controller.focusChanged(to: editable)
        controller.focusChanged(to: nil)
        expectEqual(controller.input, .local(text: ""))
    }

    test("a secure field shows nothing and clears what we typed") {
        let (controller, _) = makeController()
        controller.press(KeyDefinition(id: "x", kind: .standard, label: "x", action: .text("secr")))
        var secure = editable
        secure.isSecure = true
        secure.text = ""
        controller.focusChanged(to: secure)
        expectEqual(controller.input, .secure)
        expectEqual(controller.echo, "", "a password must not sit in our buffer")
    }

    test("typing into a secure field never reaches the buffer") {
        let (controller, sink) = makeController()
        var secure = editable
        secure.isSecure = true
        controller.focusChanged(to: secure)
        controller.press(KeyDefinition(id: "x", kind: .standard, label: "x", action: .text("pw")))
        expectEqual(controller.echo, "")
        expectEqual(sink.typed, ["pw"], "the keystroke still goes through")
    }

    test("the app name comes from the focused field, not just the frontmost app") {
        let (controller, _) = makeController()
        controller.focusChanged(to: editable)
        expectEqual(controller.frontmostAppName, "TextEdit")
    }

    test("switching apps drops what we typed into the last one") {
        let (controller, _) = makeController()
        controller.press(KeyDefinition(id: "x", kind: .standard, label: "x", action: .text("draft")))
        controller.appChanged(name: "Safari", bundleID: "com.apple.Safari")
        expectEqual(controller.input, .local(text: ""))
    }

    test("switching apps drops the field we were mirroring") {
        let (controller, _) = makeController()
        controller.focusChanged(to: editable)
        controller.appChanged(name: "Safari", bundleID: "com.apple.Safari")
        expectEqual(controller.input, .local(text: ""), "the old app's text is not ours to show")
        expect(controller.focusedField == nil)
    }

    test("switching apps swaps the name and the shortcuts panel") {
        let (controller, _) = makeController()
        controller.appChanged(name: "Visual Studio Code", bundleID: "com.microsoft.VSCode")
        expectEqual(controller.frontmostAppName, "Visual Studio Code")
        expectEqual(controller.appPanel.id, "app.com.microsoft.VSCode")
    }
}
