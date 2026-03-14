import AppKit
import CoreGraphics
import os

/// Injects keyboard events into the frontmost app via CGEvent.
/// Requires Accessibility permission (checked by AccessibilityManager).
@MainActor
final class EventInjector {
    static let shared = EventInjector()
    private let source = CGEventSource(stateID: .hidSystemState)
    private static let logger = Logger(subsystem: "to.september.app", category: "EventInjector")

    private init() {}

    func send(keyCode: UInt16, modifiers: CGEventFlags = []) {
        guard let keyDown = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: true),
              let keyUp = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: false)
        else {
            Self.logger.warning("CGEvent creation failed for keyCode \(keyCode) — accessibility likely not granted")
            return
        }

        if !modifiers.isEmpty {
            keyDown.flags = modifiers
            keyUp.flags = modifiers
        }

        keyDown.post(tap: .cghidEventTap)
        keyUp.post(tap: .cghidEventTap)
        Self.logger.debug("Sent keyCode \(keyCode) modifiers \(modifiers.rawValue)")
    }

    func send(keyCode: UInt16, shift: Bool) {
        if shift {
            send(keyCode: keyCode, modifiers: .maskShift)
        } else {
            send(keyCode: keyCode)
        }
    }

    /// Insert text via clipboard (Cmd+V). Saves and restores the user's clipboard.
    func paste(_ text: String) {
        let pasteboard = NSPasteboard.general
        let saved = pasteboard.pasteboardItems?.compactMap { item -> (NSPasteboard.PasteboardType, Data)? in
            guard let type = item.types.first, let data = item.data(forType: type) else { return nil }
            return (type, data)
        } ?? []

        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        send(keyCode: KeyCodes.v, modifiers: .maskCommand)

        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(100))
            pasteboard.clearContents()
            for (type, data) in saved {
                pasteboard.setData(data, forType: type)
            }
        }
    }

    /// Type a string character-by-character via unicode events.
    func typeString(_ text: String) {
        for char in text {
            let unichars = Array(String(char).utf16)
            guard let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: true),
                  let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: false)
            else { continue }
            keyDown.keyboardSetUnicodeString(stringLength: unichars.count, unicodeString: unichars)
            keyUp.keyboardSetUnicodeString(stringLength: unichars.count, unicodeString: unichars)
            keyDown.post(tap: .cghidEventTap)
            keyUp.post(tap: .cghidEventTap)
        }
    }
}
