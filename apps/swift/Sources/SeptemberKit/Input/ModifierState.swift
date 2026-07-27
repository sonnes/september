/// Latching modifiers, the way Apple's Sticky Keys works: one tap holds the
/// modifier for the next keystroke, a second tap locks it, a third clears it.
/// Without this a one-pointer user cannot press ⌘C at all.
public struct ModifierState: Sendable, Equatable {
    public private(set) var latched: Modifiers = []
    public private(set) var locked: Modifiers = []

    public init() {}

    public var active: Modifiers { latched.union(locked) }
    public var isCapsLockOn: Bool { locked.contains(.capsLock) }

    public mutating func tap(_ modifier: Modifiers) {
        // Caps lock is a plain toggle — it never expires after one keystroke.
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

    public mutating func clear() {
        latched = []
        locked = []
    }

    /// Case of a typed character under the current shift / caps lock state.
    /// Shift and caps lock together cancel out, as on a hardware keyboard.
    public func apply(to character: String) -> String {
        let shift = active.contains(.shift)
        let caps = isCapsLockOn
        return shift != caps ? character.uppercased() : character.lowercased()
    }
}
