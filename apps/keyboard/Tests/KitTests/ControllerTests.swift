import Foundation
import SeptemberKit

/// Records what would have been posted, so key handling is testable without
/// injecting real events into whatever app happens to be frontmost.
final class RecordingSink: KeystrokeSink, @unchecked Sendable {
    var posted: [Keystroke] = []
    var typed: [String] = []
    var beeps = 0
    var media: [MediaKey] = []
    var scrolls: [(direction: ScrollDirection, point: CGPoint)] = []

    func post(_ events: [Keystroke]) { posted.append(contentsOf: events) }
    func scroll(_ direction: ScrollDirection, at point: CGPoint) { scrolls.append((direction, point)) }
    func post(media key: MediaKey) { media.append(key) }
    func type(_ text: String) { typed.append(text) }
    func beep() { beeps += 1 }

    func reset() {
        posted = []
        typed = []
        beeps = 0
        media = []
        scrolls = []
    }

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
        7: ("x", "X"),
        8: ("c", "C"),
        9: ("v", "V"),
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
        sink: sink, panels: try PanelStore.bundled(), accents: try AccentTable.bundled("en"), keyCodeMap: stubMap,
        talk: TalkSession(said: SaidList(database: memoryDatabase())))
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
    test("a chord with delete leaves the echo as it is, from a key or a panel") {
        let (controller, _) = try makeController()
        controller.press(key("key-a"))
        controller.perform(.shortcut(Shortcut(modifiers: .command, key: .virtual(.delete))))
        expectEqual(controller.input, .local(text: "a"))
        controller.press(key("command-left"))
        controller.press(key("delete"))
        expectEqual(controller.input, .local(text: "a"))
    }

    test("a new input source changes the keys that typing posts") {
        let (controller, sink) = try makeController()
        controller.layoutChanged(to: KeyCodeMap { code, _ in code == 12 ? "a" : nil })
        controller.press(key("key-a"))
        expectEqual(sink.downs.map(\.key), [12])
    }

    test("a panel return clears the echo and a panel delete drops one character") {
        let (controller, _) = try makeController()
        controller.press(key("key-a"))
        controller.press(key("key-s"))
        controller.perform(.shortcut(Shortcut(modifiers: [], key: .virtual(.delete))))
        expectEqual(controller.input, .local(text: "a"))
        controller.perform(.shortcut(Shortcut(modifiers: [], key: .virtual(.return))))
        expectEqual(controller.input, .local(text: ""))
    }

    test("a shortcut on a layout without its letter uses the ASCII-capable layout") {
        let sink = RecordingSink()
        let cyrillic = KeyCodeMap(
            probe: { code, _ in code == 6 ? "я" : nil },
            shortcutProbe: { code, _ in code == 6 ? "z" : nil }
        )
        let controller = KeyboardController(
            sink: sink, panels: try PanelStore.bundled(), accents: try AccentTable.bundled("en"), keyCodeMap: cyrillic,
            talk: TalkSession(said: SaidList(database: memoryDatabase())))
        controller.perform(.shortcut(Shortcut(modifiers: .command, key: .character("z"))))
        expectEqual(sink.downs.map(\.key), [55, 6])

        sink.reset()
        controller.press(key("command-left"))
        controller.press(key("key-z"))
        expectEqual(sink.downs.map(\.key), [55, 6])
    }

    test("a shortcut with no key on any layout beeps and keeps the modifier") {
        let (controller, sink) = try makeController()
        controller.press(key("command-left"))
        controller.press(key("key-q"))
        expectEqual(sink.downs.map(\.key), [55], "only the Command down of the latch")
        expectEqual(sink.beeps, 1)
        expectEqual(controller.modifiers.active, .command)

        controller.press(key("key-c"))
        expectEqual(sink.downs.last?.flags, .command)
        expectEqual(controller.modifiers.active, [])
    }

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
        expectEqual(sink.downs.map(\.key), [55, 8])
        expectEqual(sink.downs.last?.flags, .command)
        expectEqual(controller.input, .local(text: ""), "a shortcut is not typed text")
    }

    test("a latched fn holds fn down for the next key") {
        let (controller, sink) = try makeController()
        controller.press(key("fn"))
        controller.press(key("f1"))
        expectEqual(sink.downs.map(\.key), [63, VirtualKey.f1.rawValue])
        expectEqual(sink.downs.last?.flags, .function)
    }

    test("an F-key under an fn that macOS holds sends the F-key and no fn down") {
        let (controller, sink) = try makeController()
        controller.macModifiersChanged(.function)
        controller.press(key("f1"))
        expectEqual(sink.posted.map(\.virtualKey), [VirtualKey.f1.rawValue, VirtualKey.f1.rawValue])
        expectEqual(sink.downs.first?.flags, .function)
        expect(sink.media.isEmpty)
    }

    test("an F-key with no modifier sends its media key") {
        let (controller, sink) = try makeController()
        controller.press(key("f8"))
        expectEqual(sink.media, [.playPause])
        expect(sink.posted.isEmpty, "no F8 keystroke")
    }

    test("an F-key under a latched command sends the F-key with command") {
        let (controller, sink) = try makeController()
        controller.press(key("command-left"))
        controller.press(key("f8"))
        expectEqual(sink.downs.map(\.key), [55, VirtualKey.f8.rawValue])
        expectEqual(sink.downs.last?.flags, .command)
        expect(sink.media.isEmpty)
        sink.reset()
        controller.press(key("f8"))
        expectEqual(sink.media, [.playPause], "the latched command is used up")
    }

    test("an F-key under caps lock still sends its media key") {
        let (controller, sink) = try makeController()
        controller.press(key("capslock"))
        controller.press(key("f12"))
        expectEqual(sink.media, [.volumeUp])
    }

    test("a media key works in Talk mode and types nothing") {
        let (controller, sink) = try makeController()
        controller.mode = .talk
        controller.press(key("f8"))
        expectEqual(sink.media, [.playPause])
        expectEqual(controller.talk.text, "")
    }

    test("volume and brightness repeat while held, play or pause does not") {
        let (controller, _) = try makeController()
        expectEqual(controller.holdBehavior(for: key("f12")), .repeats)
        expectEqual(controller.holdBehavior(for: key("f1")), .repeats)
        expectEqual(controller.holdBehavior(for: key("f8")), .once)
    }

    test("a tapped modifier goes down at the OS at once") {
        let (controller, sink) = try makeController()
        controller.press(key("shift-left"))
        expectEqual(sink.posted, [Keystroke(virtualKey: 56, flags: .shift, isDown: true)])
    }

    test("a key after a latched modifier is posted inside it, and then the modifier goes up") {
        let (controller, sink) = try makeController()
        controller.press(key("command-left"))
        sink.reset()
        controller.press(key("key-c"))
        expectEqual(sink.posted, [
            Keystroke(virtualKey: 8, flags: .command, isDown: true),
            Keystroke(virtualKey: 8, flags: .command, isDown: false),
            Keystroke(virtualKey: 55, flags: [], isDown: false),
        ])
    }

    test("a locked modifier stays down at the OS until the third tap") {
        let (controller, sink) = try makeController()
        controller.press(key("command-left"))
        controller.press(key("command-left"))
        expectEqual(sink.posted.count, 1, "the second tap posts nothing")
        sink.reset()
        controller.press(key("key-c"))
        expectEqual(sink.posted.map(\.virtualKey), [8, 8], "no Command up after a chord")
        sink.reset()
        controller.press(key("command-right"))
        expectEqual(sink.posted, [Keystroke(virtualKey: 55, flags: [], isDown: false)])
    }

    test("two latched modifiers go down in order and up in reverse") {
        let (controller, sink) = try makeController()
        controller.press(key("command-left"))
        controller.press(key("shift-left"))
        sink.reset()
        controller.press(key("key-z"))
        expectEqual(sink.posted.map(\.virtualKey), [6, 6, 55, 56])
        expectEqual(sink.posted.first?.flags, [.command, .shift])
        expectEqual(sink.posted.last?.flags, [])
    }

    test("caps lock is never held at the OS") {
        let (controller, sink) = try makeController()
        controller.press(key("capslock"))
        expect(sink.posted.isEmpty)
    }

    test("a key or a click from another source uses up a latched modifier and keeps a locked one") {
        let (controller, sink) = try makeController()
        controller.press(key("shift-left"))
        controller.press(key("command-left"))
        controller.press(key("command-left"))
        sink.reset()
        controller.otherInputPressed()
        expectEqual(controller.modifiers.active, .command)
        expectEqual(sink.posted, [Keystroke(virtualKey: 56, flags: .command, isDown: false)])
        sink.reset()
        controller.otherInputPressed()
        expect(sink.posted.isEmpty)
    }

    test("Talk mode releases the modifiers at the OS and holds none") {
        let (controller, sink) = try makeController()
        controller.press(key("option-left"))
        sink.reset()
        controller.mode = .talk
        expectEqual(sink.posted, [Keystroke(virtualKey: 58, flags: [], isDown: false)])
        sink.reset()
        controller.press(key("control"))
        expect(sink.posted.isEmpty, "the app in front gets no events in Talk mode")
        controller.mode = .type
        expectEqual(sink.posted, [
            Keystroke(virtualKey: 59, flags: .control, isDown: true),
            Keystroke(virtualKey: 58, flags: [.control, .option], isDown: true),
        ], "Type mode holds the modifiers that are still on")
    }

    test("a quit releases every modifier that the keyboard holds at the OS") {
        let (controller, sink) = try makeController()
        controller.press(key("control"))
        controller.press(key("control"))
        sink.reset()
        controller.releaseSystemModifiers()
        expectEqual(sink.posted, [Keystroke(virtualKey: 59, flags: [], isDown: false)])
        sink.reset()
        controller.releaseSystemModifiers()
        expect(sink.posted.isEmpty, "the keyboard holds nothing after a release")
    }

    test("a modifier that macOS holds goes into the next key without a posted down") {
        let (controller, sink) = try makeController()
        controller.macModifiersChanged(.shift)
        expectEqual(controller.modifiers.active, .shift)
        expect(sink.posted.isEmpty, "macOS already holds Shift")
        controller.press(key("key-a"))
        expectEqual(sink.posted.map(\.virtualKey), [0, 0])
        expectEqual(sink.downs.first?.flags, .shift)
        expectEqual(controller.input, .local(text: "A"))
        expectEqual(controller.modifiers.active, .shift, "macOS releases its own modifier")
        controller.macModifiersChanged([])
        expectEqual(controller.modifiers.active, [])
    }

    test("a latched Command that the hardware then holds stays down for each key until the hardware lets go") {
        let (controller, sink) = try makeController()
        controller.press(key("command-left"))
        controller.macModifiersChanged(.command)
        sink.reset()
        controller.press(key("key-c"))
        controller.press(key("key-v"))
        expectEqual(sink.downs.map(\.key), [8, 9])
        expectEqual(sink.downs.map(\.flags), [.command, .command])
        expect(!sink.posted.contains { $0.virtualKey == 55 }, "the keyboard posts no Command up while the hardware holds it")
        sink.reset()
        controller.macModifiersChanged([])
        expectEqual(sink.posted, [Keystroke(virtualKey: 55, flags: [], isDown: false)], "the keyboard lets go of its own Command")
    }

    test("a modifier that macOS holds gets no down when the keyboard latches it") {
        let (controller, sink) = try makeController()
        controller.macModifiersChanged(.command)
        controller.press(key("command-left"))
        expect(sink.posted.isEmpty)
        controller.macModifiersChanged([])
        expectEqual(sink.posted, [Keystroke(virtualKey: 55, flags: .command, isDown: true)], "the latch is still on")
    }

    test("a modifier that macOS holds is never posted, also after Talk mode") {
        let (controller, sink) = try makeController()
        controller.macModifiersChanged(.command)
        controller.mode = .talk
        controller.mode = .type
        controller.releaseSystemModifiers()
        expect(sink.posted.isEmpty)
    }

    test("a scroll button scrolls where the pointer last rested, in Type and Talk mode") {
        let (controller, sink) = try makeController()
        controller.pointerRested(at: CGPoint(x: 300, y: 200))
        controller.perform(.scroll(.down))
        controller.mode = .talk
        controller.perform(.scroll(.up))
        expectEqual(sink.scrolls.map(\.direction), [.down, .up])
        expectEqual(sink.scrolls.first?.point, CGPoint(x: 300, y: 200))
        expect(sink.posted.isEmpty, "a scroll presses no key")
    }

    test("a scroll button beeps when the pointer has rested nowhere yet") {
        let (controller, sink) = try makeController()
        controller.perform(.scroll(.down))
        expect(sink.scrolls.isEmpty)
        expectEqual(sink.beeps, 1)
    }

    test("a scroll keeps a latched modifier for the next key") {
        let (controller, _) = try makeController()
        controller.pointerRested(at: .zero)
        controller.press(key("shift-left"))
        controller.perform(.scroll(.down))
        expectEqual(controller.modifiers.active, .shift)
    }

    test("fn and a letter make a shortcut, not text") {
        let (controller, sink) = try makeController()
        controller.press(key("fn"))
        controller.press(key("key-a"))
        expectEqual(sink.downs.map(\.key), [63, 0])
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
            [56, 55, 6]
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
