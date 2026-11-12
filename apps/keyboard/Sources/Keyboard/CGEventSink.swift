import AppKit
import SeptemberKit

/// Posts keystrokes as real events. The panel never takes focus, so whatever
/// the user was working in is still frontmost and receives them.
@MainActor
final class CGEventSink: KeystrokeSink {
    private let source = CGEventSource(stateID: .combinedSessionState)

    /// Runs after keystrokes land, so the focus watcher can re-read the field
    /// they went into.
    var afterPost: (() -> Void)?

    func post(_ events: [Keystroke]) {
        for event in events {
            guard
                let cgEvent = CGEvent(
                    keyboardEventSource: source,
                    virtualKey: event.virtualKey,
                    keyDown: event.isDown
                )
            else { continue }
            cgEvent.flags = event.flags.eventFlags
            cgEvent.post(tap: .cghidEventTap)
        }
        afterPost?()
    }

    /// Posts a media key. Volume, brightness, and the track keys are
    /// system-defined events (subtype 8), as a hardware keyboard sends them.
    /// The other keys are key events with the key code of an Apple keyboard.
    func post(media key: MediaKey) {
        switch key.event {
        case .key(let code):
            post(Keystroke.events(virtualKey: code, modifiers: []))
        case .system(let type):
            for isDown in [true, false] {
                let state = isDown ? 0xA : 0xB
                let event = NSEvent.otherEvent(
                    with: .systemDefined,
                    location: .zero,
                    modifierFlags: NSEvent.ModifierFlags(rawValue: UInt(state << 8)),
                    timestamp: 0,
                    windowNumber: 0,
                    context: nil,
                    subtype: 8,
                    data1: Int(type) << 16 | state << 8,
                    data2: -1)
                event?.cgEvent?.post(tap: .cghidEventTap)
            }
        }
    }

    /// Characters the current layout cannot produce (emoji, saved phrases) are
    /// posted as a unicode payload instead of a key code.
    func type(_ text: String) {
        guard !text.isEmpty else { return }
        var utf16 = Array(text.utf16)
        for isDown in [true, false] {
            guard
                let event = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: isDown)
            else { continue }
            event.keyboardSetUnicodeString(stringLength: utf16.count, unicodeString: &utf16)
            event.post(tap: .cghidEventTap)
        }
        afterPost?()
    }

    func beep() {
        NSSound.beep()
    }
}
