import Foundation
import SeptemberKit
import Testing

/// Records what would have been posted, so key handling is testable without
/// injecting real events into whatever app happens to be frontmost.
final class RecordingSink: KeystrokeSink {
    var posted: [Keystroke] = []
    var typed: [String] = []

    func post(_ events: [Keystroke]) { posted.append(contentsOf: events) }
    func type(_ text: String) { typed.append(text) }

    func reset() {
        posted = []
        typed = []
    }

    /// Key-down events only — the shape a caller cares about.
    var downs: [(key: UInt16, flags: Modifiers)] {
        posted.filter(\.isDown).map { ($0.virtualKey, $0.flags) }
    }
}

/// A stub US layout covering the characters the tests type.
private let stubMap = KeyCodeMap { code, modifiers in
    let table: [UInt16: (plain: String, shifted: String)] = [
        0: ("a", "A"),
        1: ("s", "S"),
        6: ("z", "Z"),
        8: ("c", "C"),
        18: ("1", "!"),
    ]
    guard let entry = table[code] else { return nil }
    return modifiers.contains(.shift) ? entry.shifted : entry.plain
}

/// A controller with the bundled panels and the stub layout, so no test
/// depends on the machine's own keyboard layout.
@MainActor
func makeController() throws -> (KeyboardController, RecordingSink) {
    let sink = RecordingSink()
    let controller = KeyboardController(
        sink: sink, panels: try PanelStore.bundled(), keyCodeMap: stubMap)
    return (controller, sink)
}

private func key(_ id: String) -> KeyDefinition {
    for row in KeyboardLayout.rows {
        if let match = row.keys.first(where: { $0.id == id }) { return match }
    }
    fatalError("no key \(id)")
}

@MainActor
struct ControllerTests {
    @Test func `typing a letter posts that key and echoes it`() throws {
        let (controller, sink) = try makeController()
        controller.press(key("key-a"))
        #expect(sink.downs.count == 1)
        #expect(sink.downs.first?.key == 0)
        #expect(sink.downs.first?.flags == [])
        #expect(controller.input == .local(text: "a"))
    }

    @Test func `a latched shift uppercases exactly one letter`() throws {
        let (controller, sink) = try makeController()
        controller.press(key("shift-left"))
        controller.press(key("key-a"))
        #expect(sink.downs.first?.flags == .shift)
        #expect(controller.input == .local(text: "A"))

        sink.reset()
        controller.press(key("key-s"))
        #expect(sink.downs.first?.flags == [], "shift should have expired")
        #expect(controller.input == .local(text: "As"))
    }

    @Test func `caps lock stays on until tapped again`() throws {
        let (controller, _) = try makeController()
        controller.press(key("capslock"))
        controller.press(key("key-a"))
        controller.press(key("key-s"))
        #expect(controller.input == .local(text: "AS"))
        controller.press(key("capslock"))
        controller.press(key("key-a"))
        #expect(controller.input == .local(text: "ASa"))
    }

    @Test func `a latched command makes the next letter a shortcut, not text`() throws {
        let (controller, sink) = try makeController()
        controller.press(key("command-left"))
        controller.press(key("key-c"))
        #expect(sink.downs.map(\.key) == [55, 8])
        #expect(sink.downs.last?.flags == .command)
        #expect(controller.input == .local(text: ""), "a shortcut is not typed text")
    }

    @Test func `a latched fn holds fn down for the next key`() throws {
        let (controller, sink) = try makeController()
        controller.press(key("fn"))
        controller.press(key("f1"))
        #expect(sink.downs.map(\.key) == [63, VirtualKey.f1.rawValue])
        #expect(sink.downs.last?.flags == .function)
    }

    @Test func `fn and a letter make a shortcut, not text`() throws {
        let (controller, sink) = try makeController()
        controller.press(key("fn"))
        controller.press(key("key-a"))
        #expect(sink.downs.map(\.key) == [63, 0])
        #expect(sink.downs.last?.flags == .function)
        #expect(controller.input == .local(text: ""))
    }

    @Test func `shift plus a dual key types the secondary glyph`() throws {
        let (controller, _) = try makeController()
        controller.press(key("shift-left"))
        controller.press(key("key-1"))
        #expect(controller.input == .local(text: "!"))
    }

    @Test func `delete removes the last character and return clears the line`() throws {
        let (controller, _) = try makeController()
        controller.press(key("key-a"))
        controller.press(key("key-s"))
        controller.press(key("delete"))
        #expect(controller.input == .local(text: "a"))
        controller.press(key("space"))
        #expect(controller.input == .local(text: "a "))
        controller.press(key("return"))
        #expect(controller.input == .local(text: ""))
    }

    @Test func `a panel shortcut posts its whole combination`() throws {
        let (controller, sink) = try makeController()
        controller.perform(.shortcut(Shortcut(modifiers: [.command, .shift], key: .character("z"))))
        #expect(sink.downs.map(\.key) == [56, 55, 6])
        #expect(sink.downs.last?.flags == [.command, .shift])
    }

    @Test func `a text action is typed verbatim`() throws {
        let (controller, sink) = try makeController()
        controller.perform(.text("Hello"))
        #expect(sink.typed == ["Hello"])
        #expect(controller.input == .local(text: "Hello"))
    }

    @Test func `a panel button uses up a latched modifier`() throws {
        let (controller, sink) = try makeController()
        controller.press(key("shift-left"))
        controller.perform(.text("hi"))
        controller.press(key("key-a"))
        #expect(sink.downs.last?.flags == [])
        #expect(controller.input == .local(text: "hia"))
    }

    @Test func `a panel return clears the echo and a panel delete drops one character`() throws {
        let (controller, _) = try makeController()
        controller.press(key("key-a"))
        controller.press(key("key-s"))
        controller.perform(.shortcut(Shortcut(modifiers: [], key: .virtual(.delete))))
        #expect(controller.input == .local(text: "a"))
        controller.perform(.shortcut(Shortcut(modifiers: [], key: .virtual(.return))))
        #expect(controller.input == .local(text: ""))
    }

    @Test func `a chord with delete leaves the echo as it is`() throws {
        let (controller, _) = try makeController()
        controller.press(key("key-a"))
        controller.perform(.shortcut(Shortcut(modifiers: .command, key: .virtual(.delete))))
        #expect(controller.input == .local(text: "a"))
    }

    @Test func `a shortcut on a layout without its letter uses the ASCII-capable layout`() throws {
        let sink = RecordingSink()
        let cyrillic = KeyCodeMap(
            probe: { code, _ in code == 6 ? "я" : nil },
            shortcutProbe: { code, _ in code == 6 ? "z" : nil }
        )
        let controller = KeyboardController(
            sink: sink, panels: try PanelStore.bundled(), keyCodeMap: cyrillic)
        controller.perform(.shortcut(Shortcut(modifiers: .command, key: .character("z"))))
        #expect(sink.downs.map(\.key) == [55, 6])

        sink.reset()
        controller.press(key("command-left"))
        controller.press(key("key-z"))
        #expect(sink.downs.map(\.key) == [55, 6])
    }

    @Test func `a new input source changes the keys that typing posts`() throws {
        let (controller, sink) = try makeController()
        controller.layoutChanged(to: KeyCodeMap { code, _ in code == 12 ? "a" : nil })
        controller.press(key("key-a"))
        #expect(sink.downs.map(\.key) == [12])
    }

    @Test func `characters the layout cannot produce fall back to unicode injection`() throws {
        let (controller, sink) = try makeController()
        controller.press(
            KeyDefinition(id: "emoji", kind: .standard, label: "🙂", action: .character("🙂"))
        )
        #expect(sink.typed == ["🙂"])
        #expect(sink.posted.count == 0)
    }
}
