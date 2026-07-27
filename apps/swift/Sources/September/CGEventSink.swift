import CoreGraphics
import SeptemberKit

/// Posts keystrokes as real events. The panel never takes focus, so whatever
/// the user was working in is still frontmost and receives them.
///
/// `@unchecked Sendable`: the CGEventSource is only touched from the main
/// actor, where every key press originates.
final class CGEventSink: KeystrokeSink, @unchecked Sendable {
    private let source = CGEventSource(stateID: .combinedSessionState)

    func post(_ events: [Keystroke]) {
        for event in events {
            guard
                let cgEvent = CGEvent(
                    keyboardEventSource: source,
                    virtualKey: event.virtualKey,
                    keyDown: event.isDown
                )
            else { continue }
            cgEvent.flags = event.flags.cgEventFlags
            cgEvent.post(tap: .cghidEventTap)
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
    }
}

extension Modifiers {
    var cgEventFlags: CGEventFlags {
        var flags: CGEventFlags = []
        if contains(.shift) { flags.insert(.maskShift) }
        if contains(.control) { flags.insert(.maskControl) }
        if contains(.option) { flags.insert(.maskAlternate) }
        if contains(.command) { flags.insert(.maskCommand) }
        if contains(.function) { flags.insert(.maskSecondaryFn) }
        return flags
    }
}
