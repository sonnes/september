import CoreGraphics

@MainActor
final class EventInjector {
    static let shared = EventInjector()
    private let source = CGEventSource(stateID: .hidSystemState)

    private init() {}

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
}
