/// Latching modifiers, the way Apple's Sticky Keys works: one tap holds the
/// modifier for the next keystroke, a second tap locks it, a third clears it.
/// Without this a one-pointer user cannot press ⌘C at all.
public struct ModifierState: Sendable, Equatable {
    public private(set) var latched: Modifiers = []
    public private(set) var locked: Modifiers = []
    /// The modifiers that macOS holds: the modifier keys that the user holds
    /// on the hardware keyboard. They change only when macOS reports new
    /// flags.
    public internal(set) var mac: Modifiers = []

    public init() {}

    public var active: Modifiers { own.union(mac) }
    public var own: Modifiers { latched.union(locked) }
    /// The modifiers that the keyboard holds at the OS: its own, without
    /// caps lock, because macOS owns its toggle.
    public var ownFlags: Modifiers { own.subtracting(.capsLock) }
    /// The modifiers that a posted key holds. Caps lock is not one, because
    /// macOS owns its toggle.
    public var flags: Modifiers { active.subtracting(.capsLock) }
    /// The modifiers that make a key a shortcut, such as ⌘C. Shift alone
    /// only types the shifted character.
    public var chord: Modifiers { flags.subtracting(.shift) }
    /// True when a modifier other than caps lock is on. Then the F-row sends
    /// F-keys, not media keys.
    public var holdsChord: Bool { !flags.isEmpty }

    public var isCapsLockOn: Bool { locked.contains(.capsLock) }

    public mutating func tap(_ modifier: Modifiers) {
        if modifier == .capsLock {
            if locked.contains(.capsLock) {
                locked.remove(.capsLock)
            } else {
                locked.insert(.capsLock)
            }
            return
        }

        if locked.contains(modifier) {
            locked.remove(modifier)
        } else if latched.contains(modifier) {
            latched.remove(modifier)
            locked.insert(modifier)
        } else {
            latched.insert(modifier)
        }
    }

    /// Called after a non-modifier key: latched modifiers expire, locked stay.
    public mutating func consume() {
        latched = []
    }

    /// Case of a typed character under the current shift / caps lock state.
    /// Shift and caps lock together cancel out, as on a hardware keyboard.
    public func apply(to character: String) -> String {
        let shift = active.contains(.shift)
        let caps = isCapsLockOn
        return shift != caps ? character.uppercased() : character.lowercased()
    }
}
