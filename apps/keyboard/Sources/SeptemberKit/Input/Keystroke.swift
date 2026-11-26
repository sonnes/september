import CoreGraphics

/// One key event to post. The sink turns these into CGEvents; keeping them as
/// plain values means the whole sequencing story is testable.
public struct Keystroke: Sendable, Equatable {
    public let virtualKey: UInt16
    public let flags: Modifiers
    public let isDown: Bool
    /// True for the events of a held key after the first press. The sink
    /// sets the autorepeat field of the event, as a hardware keyboard does.
    public var isRepeat: Bool

    public init(virtualKey: UInt16, flags: Modifiers, isDown: Bool, isRepeat: Bool = false) {
        self.virtualKey = virtualKey
        self.flags = flags
        self.isDown = isDown
        self.isRepeat = isRepeat
    }

    /// The user data of the event source of the keyboard. It marks each event
    /// that the keyboard posts, as the Apple Accessibility Keyboard marks its
    /// own events.
    public static let sourceMarker: Int64 = 0x5345_5054  // "SEPT"

    /// The keys that a hardware keyboard sends with the Fn flag: the arrows,
    /// the navigation keys, Forward Delete, and the F-keys.
    static let secondaryFnKeys: Set<UInt16> = [
        123, 124, 125, 126,  // arrows
        115, 119, 116, 121, 117,  // Home, End, Page Up, Page Down, Forward Delete
        122, 120, 99, 118, 96, 97, 98, 100, 101, 109, 103, 111,  // F1 to F12
    ]

    /// The flags of the event: the modifiers, and Fn for a key that a
    /// hardware keyboard sends with Fn.
    public var eventFlags: CGEventFlags {
        var result = flags.eventFlags
        if Self.secondaryFnKeys.contains(virtualKey) { result.insert(.maskSecondaryFn) }
        return result
    }

    /// The text cut into characters. The sink posts one event pair for each
    /// character, so that an emoji with a modifier stays in one pair.
    public static func unicodeChunks(of text: String) -> [String] {
        text.map(String.init)
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
