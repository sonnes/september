import CoreGraphics

/// One key event to post. The sink turns these into CGEvents; keeping them as
/// plain values means the whole sequencing story is testable.
public struct Keystroke: Sendable, Equatable {
    public let virtualKey: UInt16
    public let flags: Modifiers
    public let isDown: Bool

    public init(virtualKey: UInt16, flags: Modifiers, isDown: Bool) {
        self.virtualKey = virtualKey
        self.flags = flags
        self.isDown = isDown
    }

    /// Modifier downs, the key, then modifier ups in reverse: the order a
    /// hardware keyboard produces, which is what apps expect to see. A
    /// modifier in `held` is already down at the OS, so it gets no down and
    /// no up, but it stays in the flags.
    public static func events(
        virtualKey: UInt16, modifiers: Modifiers, held: Modifiers = []
    ) -> [Keystroke] {
        let pressed = modifiers.subtracting(held).heldKeys
        var accumulated = modifiers.intersection(held)
        var events: [Keystroke] = []

        for key in pressed {
            accumulated.insert(key.modifier)
            events.append(Keystroke(virtualKey: key.virtualKey, flags: accumulated, isDown: true))
        }

        events.append(Keystroke(virtualKey: virtualKey, flags: accumulated, isDown: true))
        events.append(Keystroke(virtualKey: virtualKey, flags: accumulated, isDown: false))

        for key in pressed.reversed() {
            accumulated.remove(key.modifier)
            events.append(Keystroke(virtualKey: key.virtualKey, flags: accumulated, isDown: false))
        }

        return events
    }

    /// The downs and ups that change the modifiers held at the OS from `old`
    /// to `new`. Ups come first, in reverse order. Downs follow, in press
    /// order.
    public static func modifierChanges(from old: Modifiers, to new: Modifiers) -> [Keystroke] {
        var accumulated = old
        var events: [Keystroke] = []
        for key in old.subtracting(new).heldKeys.reversed() {
            accumulated.remove(key.modifier)
            events.append(Keystroke(virtualKey: key.virtualKey, flags: accumulated, isDown: false))
        }
        for key in new.subtracting(old).heldKeys {
            accumulated.insert(key.modifier)
            events.append(Keystroke(virtualKey: key.virtualKey, flags: accumulated, isDown: true))
        }
        return events
    }
}

/// Where keystrokes go. The app posts CGEvents; tests record them.
@MainActor
public protocol KeystrokeSink: AnyObject {
    func post(_ events: [Keystroke])
    /// A media or system control, such as Play or Pause.
    func post(media key: MediaKey)
    /// One step of scroll at `point`, in screen coordinates from the top left.
    func scroll(_ direction: ScrollDirection, at point: CGPoint)
    /// Literal text, injected as a unicode string so emoji and non-layout
    /// characters work without a matching physical key.
    func type(_ text: String)
    /// Tells the user that a key press sent nothing.
    func beep()
}
