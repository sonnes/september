import AppKit
import CoreGraphics

// MARK: - ModifierState
//
// Tracks sticky modifier key state for the on-screen keyboard.
// Modifiers are "sticky" — tap Cmd, it stays active until a character key
// is pressed, then all modifiers except CapsLock reset.
//
// STATE MACHINE:
//
//   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌───────────────┐
//   │ tap Cmd  │────▶│ tap Shift│────▶│ tap Z    │────▶│ send Z with   │
//   │ cmd=ON   │     │ shift=ON │     │          │     │ Cmd+Shift     │
//   └──────────┘     └──────────┘     └──────────┘     │ then reset    │
//                                                       │ cmd=OFF       │
//                                                       │ shift=OFF     │
//                                                       │ caps=unchanged│
//                                                       └───────────────┘
//
//   CapsLock: toggle on tap, persists through character presses.
//   All other modifiers: toggle on tap, clear after character press.

@MainActor
@Observable
final class ModifierState {
    var isShiftActive = false
    var isCapsLockOn = false
    var isCommandActive = false
    var isControlActive = false
    var isOptionActive = false

    /// Effective shift state: Shift OR CapsLock.
    var effectiveShift: Bool { isShiftActive || isCapsLockOn }

    /// Toggle a modifier key on/off. Posts VoiceOver announcement.
    func toggle(_ keyCode: UInt16) {
        switch keyCode {
        case KeyCodes.shift, KeyCodes.rightShift:
            isShiftActive.toggle()
            announceModifier("Shift", active: isShiftActive)
        case KeyCodes.capsLock:
            isCapsLockOn.toggle()
            announceModifier("Caps Lock", active: isCapsLockOn)
        case KeyCodes.command, KeyCodes.rightCommand:
            isCommandActive.toggle()
            announceModifier("Command", active: isCommandActive)
        case KeyCodes.control, KeyCodes.rightControl:
            isControlActive.toggle()
            announceModifier("Control", active: isControlActive)
        case KeyCodes.option, KeyCodes.rightOption:
            isOptionActive.toggle()
            announceModifier("Option", active: isOptionActive)
        default:
            break
        }
    }

    /// Returns combined CGEventFlags for the current modifier state.
    func modifierFlags() -> CGEventFlags {
        var flags: CGEventFlags = []
        if effectiveShift { flags.insert(.maskShift) }
        if isCommandActive { flags.insert(.maskCommand) }
        if isControlActive { flags.insert(.maskControl) }
        if isOptionActive { flags.insert(.maskAlternate) }
        return flags
    }

    /// Reset all modifiers except CapsLock after a character key press.
    func resetAfterKeyPress() {
        isShiftActive = false
        isCommandActive = false
        isControlActive = false
        isOptionActive = false
    }

    /// Whether any modifier (except CapsLock) is currently active.
    var hasActiveModifiers: Bool {
        isShiftActive || isCommandActive || isControlActive || isOptionActive
    }

    // MARK: - VoiceOver

    private func announceModifier(_ name: String, active: Bool) {
        let message = "\(name) \(active ? "on" : "off")"
        let userInfo: [NSAccessibility.NotificationUserInfoKey: Any] = [
            .announcement: message,
            .priority: NSAccessibilityPriorityLevel.high.rawValue,
        ]
        NSAccessibility.post(
            element: NSApp as Any,
            notification: .announcementRequested,
            userInfo: userInfo
        )
    }
}
