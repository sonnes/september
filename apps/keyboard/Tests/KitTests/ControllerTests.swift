import Foundation
import SeptemberKit

/// Records what would have been posted, so key handling is testable without
/// injecting real events into whatever app happens to be frontmost.
final class RecordingSink: KeystrokeSink, @unchecked Sendable {
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
func controllerTests() {
    test("typing a letter posts that key and echoes it") {
        let (controller, sink) = try makeController()
        controller.press(key("key-a"))
        expectEqual(sink.downs.count, 1)
        expectEqual(sink.downs.first?.key, 0)
        expectEqual(sink.downs.first?.flags, [])
        expectEqual(controller.input, .local(text: "a"))
    }

    test("a latched shift uppercases exactly one letter") {
        let (controller, sink) = try makeController()
        controller.press(key("shift-left"))
        controller.press(key("key-a"))
        expectEqual(sink.downs.first?.flags, .shift)
        expectEqual(controller.input, .local(text: "A"))

        sink.reset()
        controller.press(key("key-s"))
        expectEqual(sink.downs.first?.flags, [], "shift should have expired")
        expectEqual(controller.input, .local(text: "As"))
    }

    test("caps lock stays on until tapped again") {
        let (controller, _) = try makeController()
        controller.press(key("capslock"))
        controller.press(key("key-a"))
        controller.press(key("key-s"))
        expectEqual(controller.input, .local(text: "AS"))
        controller.press(key("capslock"))
        controller.press(key("key-a"))
        expectEqual(controller.input, .local(text: "ASa"))
    }

    test("a latched command makes the next letter a shortcut, not text") {
        let (controller, sink) = try makeController()
        controller.press(key("command-left"))
        controller.press(key("key-c"))
        expectEqual(sink.downs.map(\.key), [Modifiers.command.virtualKey!, 8])
        expectEqual(sink.downs.last?.flags, .command)
        expectEqual(controller.input, .local(text: ""), "a shortcut is not typed text")
    }

    test("a latched fn holds fn down for the next key") {
        let (controller, sink) = try makeController()
        controller.press(key("fn"))
        controller.press(key("f1"))
        expectEqual(sink.downs.map(\.key), [Modifiers.function.virtualKey!, VirtualKey.f1.rawValue])
        expectEqual(sink.downs.last?.flags, .function)
    }

    test("fn and a letter make a shortcut, not text") {
        let (controller, sink) = try makeController()
        controller.press(key("fn"))
        controller.press(key("key-a"))
        expectEqual(sink.downs.map(\.key), [Modifiers.function.virtualKey!, 0])
        expectEqual(sink.downs.last?.flags, .function)
        expectEqual(controller.input, .local(text: ""))
    }

    test("shift plus a dual key types the secondary glyph") {
        let (controller, _) = try makeController()
        controller.press(key("shift-left"))
        controller.press(key("key-1"))
        expectEqual(controller.input, .local(text: "!"))
    }

    test("delete removes the last character and return clears the line") {
        let (controller, _) = try makeController()
        controller.press(key("key-a"))
        controller.press(key("key-s"))
        controller.press(key("delete"))
        expectEqual(controller.input, .local(text: "a"))
        controller.press(key("space"))
        expectEqual(controller.input, .local(text: "a "))
        controller.press(key("return"))
        expectEqual(controller.input, .local(text: ""))
    }

    test("a panel shortcut posts its whole combination") {
        let (controller, sink) = try makeController()
        controller.perform(.shortcut(Shortcut(modifiers: [.command, .shift], key: .character("z"))))
        expectEqual(
            sink.downs.map(\.key),
            [Modifiers.shift.virtualKey!, Modifiers.command.virtualKey!, 6]
        )
        expectEqual(sink.downs.last?.flags, [.command, .shift])
    }

    test("a text action is typed verbatim") {
        let (controller, sink) = try makeController()
        controller.perform(.text("Hello"))
        expectEqual(sink.typed, ["Hello"])
        expectEqual(controller.input, .local(text: "Hello"))
    }

    test("a panel button uses up a latched modifier") {
        let (controller, sink) = try makeController()
        controller.press(key("shift-left"))
        controller.perform(.text("hi"))
        controller.press(key("key-a"))
        expectEqual(sink.downs.last?.flags, [])
        expectEqual(controller.input, .local(text: "hia"))
    }

    test("characters the layout cannot produce fall back to unicode injection") {
        let (controller, sink) = try makeController()
        controller.press(
            KeyDefinition(id: "emoji", kind: .standard, label: "🙂", action: .character("🙂"))
        )
        expectEqual(sink.typed, ["🙂"])
        expectEqual(sink.posted.count, 0)
    }
}
