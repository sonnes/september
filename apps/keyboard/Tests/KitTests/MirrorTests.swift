import Foundation
import SeptemberKit
import Testing

@MainActor
struct MirrorTests {
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

    @Test func `a readable field is mirrored with its caret`() throws {
        #expect(field().display == .mirrored(text: "hello", caret: 5, selectionLength: 0))
    }

    @Test func `a selection comes through as a length`() throws {
        let selected = field(text: "hello", selection: NSRange(location: 1, length: 3))
        #expect(selected.display == .mirrored(text: "hello", caret: 1, selectionLength: 3))
    }

    @Test func `the caret is clamped to the text`() throws {
        let past = field(text: "hi", selection: NSRange(location: 99, length: 4))
        #expect(past.display == .mirrored(text: "hi", caret: 2, selectionLength: 0))
    }

    @Test func `a field with no selection puts the caret at the end`() throws {
        #expect(field(selection: nil).display == .mirrored(text: "hello", caret: 5, selectionLength: 0))
    }

    @Test func `a secure field is never mirrored`() throws {
        #expect(field(text: "", role: "AXTextField", secure: true).display == .secure)
    }

    @Test func `a field the app exposes no text for is not mirrored`() throws {
        #expect(field(text: nil).display == nil)
    }

    @Test func `a read-only field is not mirrored`() throws {
        #expect(field(editable: false).display == nil)
    }

    @Test func `caret offsets are UTF-16, the same units the accessibility API uses`() throws {
        let emoji = field(text: "🙂ok", selection: NSRange(location: 2, length: 0))
        #expect(emoji.display == .mirrored(text: "🙂ok", caret: 2, selectionLength: 0))
        #expect(InputMirror.split("🙂ok", caret: 2, selectionLength: 0).before == "🙂")
    }

    @Test func `a long field is read in a window around the selection`() throws {
        let middle = FocusedField.readWindow(
            count: 10_000, selection: NSRange(location: 5_000, length: 3), radius: 200)
        #expect(middle.window == NSRange(location: 4_800, length: 403))
        #expect(middle.selection == NSRange(location: 200, length: 3))

        let start = FocusedField.readWindow(
            count: 10_000, selection: NSRange(location: 50, length: 0), radius: 200)
        #expect(start.window == NSRange(location: 0, length: 400))
        #expect(start.selection == NSRange(location: 50, length: 0))

        let end = FocusedField.readWindow(
            count: 10_000, selection: NSRange(location: 9_990, length: 0), radius: 200)
        #expect(end.window == NSRange(location: 9_790, length: 210))
        #expect(end.selection == NSRange(location: 200, length: 0))
    }

    @Test func `splitting a mirrored line gives the three runs the bar draws`() throws {
        let parts = InputMirror.split("hello", caret: 1, selectionLength: 3)
        #expect(parts.before == "h")
        #expect(parts.selected == "ell")
        #expect(parts.after == "o")
    }
}

@MainActor
struct FocusTests {
    let editable = FocusedField(
        appName: "TextEdit",
        role: "AXTextArea",
        isEditable: true,
        isSecure: false,
        text: "hello",
        selection: NSRange(location: 5, length: 0)
    )

    @Test func `with nothing focused the bar shows what we typed ourselves`() throws {
        let (controller, _) = try makeController()
        controller.focusChanged(to: nil)
        controller.perform(.text("x"))
        #expect(controller.input == .local(text: "x"))
    }

    @Test func `focusing a readable field mirrors it instead of our echo`() throws {
        let (controller, _) = try makeController()
        controller.perform(.text("x"))
        controller.focusChanged(to: editable)
        #expect(controller.input == .mirrored(text: "hello", caret: 5, selectionLength: 0))
        controller.focusChanged(to: nil)
        #expect(controller.input == .local(text: ""), "the local buffer is dropped while mirroring")
    }

    @Test func `the mirror follows the field as it changes`() throws {
        let (controller, _) = try makeController()
        controller.focusChanged(to: editable)
        var typed = editable
        typed.text = "hello!"
        typed.selection = NSRange(location: 6, length: 0)
        controller.focusChanged(to: typed)
        #expect(controller.input == .mirrored(text: "hello!", caret: 6, selectionLength: 0))
    }

    @Test func `leaving a mirrored field falls back to a fresh local echo`() throws {
        let (controller, _) = try makeController()
        controller.focusChanged(to: editable)
        controller.focusChanged(to: nil)
        #expect(controller.input == .local(text: ""))
    }

    @Test func `a secure field shows nothing and clears what we typed`() throws {
        let (controller, _) = try makeController()
        controller.perform(.text("secr"))
        var secure = editable
        secure.isSecure = true
        secure.text = ""
        controller.focusChanged(to: secure)
        #expect(controller.input == .secure)
        controller.focusChanged(to: nil)
        #expect(controller.input == .local(text: ""), "a password must not sit in our buffer")
    }

    @Test func `typing into a secure field never reaches the buffer`() throws {
        let (controller, sink) = try makeController()
        var secure = editable
        secure.isSecure = true
        controller.focusChanged(to: secure)
        controller.perform(.text("pw"))
        controller.focusChanged(to: nil)
        #expect(controller.input == .local(text: ""))
        #expect(sink.typed == ["pw"], "the keystroke still goes through")
    }

    @Test func `the app name comes from the focused field, not just the frontmost app`() throws {
        let (controller, _) = try makeController()
        controller.focusChanged(to: editable)
        #expect(controller.frontmostAppName == "TextEdit")
    }

    @Test func `a field with no app name keeps the name we have`() throws {
        let (controller, _) = try makeController()
        controller.appChanged(name: "Safari", bundleID: "com.apple.Safari")
        var unnamed = editable
        unnamed.appName = nil
        controller.focusChanged(to: unnamed)
        #expect(controller.frontmostAppName == "Safari")
    }

    @Test func `switching apps drops what we typed into the last one`() throws {
        let (controller, _) = try makeController()
        controller.perform(.text("draft"))
        controller.appChanged(name: "Safari", bundleID: "com.apple.Safari")
        #expect(controller.input == .local(text: ""))
    }

    @Test func `switching apps drops the field we were mirroring`() throws {
        let (controller, _) = try makeController()
        controller.focusChanged(to: editable)
        controller.appChanged(name: "Safari", bundleID: "com.apple.Safari")
        #expect(controller.input == .local(text: ""), "the old app's text is not ours to show")
        #expect(controller.focusedField == nil)
    }

    @Test func `the app name is unknown until an app reports one`() throws {
        let (controller, _) = try makeController()
        #expect(controller.frontmostAppName == nil)
        controller.appChanged(name: "Safari", bundleID: "com.apple.Safari")
        controller.appChanged(name: nil, bundleID: nil)
        #expect(controller.frontmostAppName == nil, "a nameless app keeps no stale name")
    }

    @Test func `switching apps swaps the name and the shortcuts panel`() throws {
        let (controller, _) = try makeController()
        controller.appChanged(name: "Visual Studio Code", bundleID: "com.microsoft.VSCode")
        #expect(controller.frontmostAppName == "Visual Studio Code")
        #expect(controller.appPanel == controller.panels.appPanel(forBundleID: "com.microsoft.VSCode"))
        #expect(controller.appPanel != controller.panels.appPanel(forBundleID: nil))
    }
}
