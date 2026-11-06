import AppKit
import CoreGraphics
import SeptemberKit

/// Listens for the chords that the user presses on the hardware keyboard, so
/// `AppPanelModel` can count and learn them.
///
/// The tap is listen-only: it never changes or drops an event. It reports only
/// key downs that hold Command or Control, so the characters that the user
/// types never leave the callback. It skips the events that Keyboard posts
/// itself, and key repeats.
///
/// The callback holds the tap without a retain, so keep a strong reference to
/// the tap while it runs.
@MainActor
final class ChordTap {
    private let onChord: (Shortcut) -> Void
    private var tap: CFMachPort?
    private var source: CFRunLoopSource?

    init(onChord: @escaping (Shortcut) -> Void) {
        self.onChord = onChord
    }

    /// True when macOS lets Keyboard listen to key events. Does not ask.
    static var isAllowed: Bool { CGPreflightListenEventAccess() }

    /// Starts the tap. Returns false when macOS refuses it, for example before
    /// the user allows Input Monitoring.
    @discardableResult
    func start() -> Bool {
        guard tap == nil else { return true }
        let mask = CGEventMask(1 << CGEventType.keyDown.rawValue)
        guard
            let tap = CGEvent.tapCreate(
                tap: .cgSessionEventTap,
                place: .tailAppendEventTap,
                options: .listenOnly,
                eventsOfInterest: mask,
                callback: chordTapCallback,
                userInfo: Unmanaged.passUnretained(self).toOpaque()
            )
        else { return false }
        let source = CFMachPortCreateRunLoopSource(nil, tap, 0)
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
        self.tap = tap
        self.source = source
        return true
    }

    func stop() {
        if let tap { CGEvent.tapEnable(tap: tap, enable: false) }
        if let source { CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes) }
        tap = nil
        source = nil
    }

    fileprivate func handle(_ type: CGEventType, chord: Shortcut?) {
        switch type {
        case .tapDisabledByTimeout, .tapDisabledByUserInput:
            if let tap { CGEvent.tapEnable(tap: tap, enable: true) }
        case .keyDown:
            if let chord { onChord(chord) }
        default:
            break
        }
    }

    /// The chord of a key down, or nil for typing, a key repeat, or an event
    /// that Keyboard posted. The flags are checked before the key is read, so
    /// a plain key press is never read.
    fileprivate nonisolated static func chord(from event: CGEvent) -> Shortcut? {
        let flags = event.flags
        guard flags.contains(.maskCommand) || flags.contains(.maskControl) else { return nil }
        guard event.getIntegerValueField(.keyboardEventAutorepeat) == 0,
            event.getIntegerValueField(.eventSourceUnixProcessID) != Int64(getpid())
        else { return nil }

        var modifiers: Modifiers = []
        for held in Modifiers.held where flags.contains(held.eventFlag) {
            modifiers.insert(held.modifier)
        }
        // Function is set on arrow and page keys by macOS itself.
        modifiers.remove(.function)

        let code = UInt16(event.getIntegerValueField(.keyboardEventKeycode))
        if let virtual = VirtualKey(rawValue: code) {
            return Shortcut(modifiers: modifiers, key: .virtual(virtual))
        }
        guard let characters = NSEvent(cgEvent: event)?.charactersIgnoringModifiers,
            characters.count == 1
        else { return nil }
        return Shortcut(modifiers: modifiers, key: .character(characters.lowercased()))
    }
}

/// Event tap callbacks are C function pointers, so the tap travels in the
/// user info pointer. The tap is on the main run loop, so the callback runs on
/// the main thread.
private func chordTapCallback(
    proxy: CGEventTapProxy,
    type: CGEventType,
    event: CGEvent,
    userInfo: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    if let userInfo {
        let tap = Unmanaged<ChordTap>.fromOpaque(userInfo).takeUnretainedValue()
        let chord = type == .keyDown ? ChordTap.chord(from: event) : nil
        MainActor.assumeIsolated { tap.handle(type, chord: chord) }
    }
    return Unmanaged.passUnretained(event)
}
