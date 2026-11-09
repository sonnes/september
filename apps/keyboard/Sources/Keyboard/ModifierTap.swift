import AppKit
import CoreGraphics
import SeptemberKit

/// Listens for the modifier keys that the user holds on the hardware keyboard,
/// so the session can show the shortcut suggestions.
///
/// The tap is listen-only: it never changes or drops an event. It reports only
/// changes of the modifier keys, so the characters that the user types never
/// reach it. It skips the events that Keyboard posts itself.
///
/// The callback holds the tap without a retain, so keep a strong reference to
/// the tap while it runs.
@MainActor
final class ModifierTap {
    private let onModifiers: (Modifiers) -> Void
    private var tap: CFMachPort?
    private var source: CFRunLoopSource?

    init(onModifiers: @escaping (Modifiers) -> Void) {
        self.onModifiers = onModifiers
    }

    /// True when macOS lets Keyboard listen to key events. Does not ask.
    static var isAllowed: Bool { CGPreflightListenEventAccess() }

    /// Starts the tap. Returns false when macOS refuses it, for example before
    /// the user allows Input Monitoring.
    @discardableResult
    func start() -> Bool {
        guard tap == nil else { return true }
        let mask = CGEventMask(1 << CGEventType.flagsChanged.rawValue)
        guard
            let tap = CGEvent.tapCreate(
                tap: .cgSessionEventTap,
                place: .tailAppendEventTap,
                options: .listenOnly,
                eventsOfInterest: mask,
                callback: modifierTapCallback,
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

    fileprivate func handle(_ type: CGEventType, modifiers: Modifiers?) {
        switch type {
        case .tapDisabledByTimeout, .tapDisabledByUserInput:
            if let tap { CGEvent.tapEnable(tap: tap, enable: true) }
        case .flagsChanged:
            if let modifiers { onModifiers(modifiers) }
        default:
            break
        }
    }

    /// The modifiers of a change of the modifier keys, or nil for an event that
    /// Keyboard posted.
    fileprivate nonisolated static func modifiers(from event: CGEvent) -> Modifiers? {
        guard event.getIntegerValueField(.eventSourceUnixProcessID) != Int64(getpid()) else { return nil }
        var modifiers: Modifiers = []
        for held in Modifiers.held where event.flags.contains(held.eventFlag) {
            modifiers.insert(held.modifier)
        }
        return modifiers
    }
}

/// Event tap callbacks are C function pointers, so the tap travels in the
/// user info pointer. The tap is on the main run loop, so the callback runs on
/// the main thread.
private func modifierTapCallback(
    proxy: CGEventTapProxy,
    type: CGEventType,
    event: CGEvent,
    userInfo: UnsafeMutableRawPointer?
) -> Unmanaged<CGEvent>? {
    if let userInfo {
        let tap = Unmanaged<ModifierTap>.fromOpaque(userInfo).takeUnretainedValue()
        let modifiers = type == .flagsChanged ? ModifierTap.modifiers(from: event) : nil
        MainActor.assumeIsolated { tap.handle(type, modifiers: modifiers) }
    }
    return Unmanaged.passUnretained(event)
}
