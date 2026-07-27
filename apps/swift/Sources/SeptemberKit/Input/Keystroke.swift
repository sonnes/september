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

    /// Modifier downs, the key, then modifier ups in reverse — the order a
    /// hardware keyboard produces, which is what apps expect to see.
    public static func events(virtualKey: UInt16, modifiers: Modifiers) -> [Keystroke] {
        let held = Modifiers.pressOrder.filter { modifiers.contains($0) }
        var accumulated: Modifiers = []
        var events: [Keystroke] = []

        for modifier in held {
            accumulated.insert(modifier)
            events.append(Keystroke(virtualKey: modifier.virtualKey!, flags: accumulated, isDown: true))
        }

        events.append(Keystroke(virtualKey: virtualKey, flags: accumulated, isDown: true))
        events.append(Keystroke(virtualKey: virtualKey, flags: accumulated, isDown: false))

        for modifier in held.reversed() {
            accumulated.remove(modifier)
            events.append(Keystroke(virtualKey: modifier.virtualKey!, flags: accumulated, isDown: false))
        }

        return events
    }
}

/// Where keystrokes go. The app posts CGEvents; tests record them.
public protocol KeystrokeSink: AnyObject, Sendable {
    func post(_ events: [Keystroke])
    /// Literal text, injected as a unicode string so emoji and non-layout
    /// characters work without a matching physical key.
    func type(_ text: String)
}
