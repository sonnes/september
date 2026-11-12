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

    /// Posts one step of scroll to the app of the window at `point`. The
    /// pointer is on the keyboard while the user presses a scroll button, so
    /// a posted scroll goes to that app, with the window and the place of
    /// the target, and not to the window under the pointer.
    func scroll(_ direction: ScrollDirection, at point: CGPoint) {
        let delta = direction.wheelDelta
        guard
            let target = Self.window(at: point),
            let event = CGEvent(
                scrollWheelEvent2Source: source, units: .pixel, wheelCount: 2,
                wheel1: delta.vertical, wheel2: delta.horizontal, wheel3: 0)
        else { return beep() }
        event.location = point
        event.setIntegerValueField(.mouseEventWindowUnderMousePointer, value: Int64(target.id))
        event.setIntegerValueField(
            .mouseEventWindowUnderMousePointerThatCanHandleThisEvent, value: Int64(target.id))
        event.postToPid(target.pid)
    }

    /// The frontmost window of another app at `point`, from the top left of
    /// the main screen.
    private static func window(at point: CGPoint) -> (id: CGWindowID, pid: pid_t)? {
        let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
        guard let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
            return nil
        }
        for window in windows {
            guard
                let layer = window[kCGWindowLayer as String] as? Int, layer == 0,
                let pid = window[kCGWindowOwnerPID as String] as? pid_t, pid != getpid(),
                let id = window[kCGWindowNumber as String] as? CGWindowID,
                let bounds = window[kCGWindowBounds as String] as? NSDictionary,
                let rect = CGRect(dictionaryRepresentation: bounds),
                rect.contains(point)
            else { continue }
            return (id, pid)
        }
        return nil
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
