import AppKit
import CoreGraphics

@MainActor
final class EventInjector {
    static let shared = EventInjector()
    private let source = CGEventSource(stateID: .hidSystemState)

    private init() {}

    /// Insert text by simulating Cmd+V with the pasteboard.
    /// Saves and restores the user's clipboard contents.
    func paste(_ text: String) {
        let pasteboard = NSPasteboard.general
        let saved = pasteboard.pasteboardItems?.compactMap { item -> (NSPasteboard.PasteboardType, Data)? in
            guard let type = item.types.first, let data = item.data(forType: type) else { return nil }
            return (type, data)
        } ?? []

        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        send(keyCode: KeyCodes.v, modifiers: .maskCommand)

        // Restore clipboard after a brief delay to let the paste complete
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            pasteboard.clearContents()
            for (type, data) in saved {
                pasteboard.setData(data, forType: type)
            }
        }
    }

    func send(keyCode: UInt16, modifiers: CGEventFlags = []) {
        guard let keyDown = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: true),
              let keyUp = CGEvent(keyboardEventSource: source, virtualKey: keyCode, keyDown: false)
        else { return }

        if !modifiers.isEmpty {
            keyDown.flags = modifiers
            keyUp.flags = modifiers
        }

        keyDown.post(tap: .cghidEventTap)
        keyUp.post(tap: .cghidEventTap)
    }

    func send(keyCode: UInt16, shift: Bool) {
        if shift {
            send(keyCode: keyCode, modifiers: .maskShift)
        } else {
            send(keyCode: keyCode)
        }
    }

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
