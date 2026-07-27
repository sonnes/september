/// Modifier keys, as a set so combinations are one value.
public struct Modifiers: OptionSet, Sendable, Hashable {
    public let rawValue: UInt8
    public init(rawValue: UInt8) { self.rawValue = rawValue }

    public static let shift = Modifiers(rawValue: 1 << 0)
    public static let control = Modifiers(rawValue: 1 << 1)
    public static let option = Modifiers(rawValue: 1 << 2)
    public static let command = Modifiers(rawValue: 1 << 3)
    public static let function = Modifiers(rawValue: 1 << 4)
    public static let capsLock = Modifiers(rawValue: 1 << 5)

    /// The virtual key posted to hold this modifier down. Caps lock has no
    /// postable key — macOS owns its toggle — so we fold it into shift instead.
    public var virtualKey: UInt16? {
        switch self {
        case .shift: 56
        case .control: 59
        case .option: 58
        case .command: 55
        case .function: 63
        default: nil
        }
    }

    /// Order modifiers are pressed in, matching how a hand builds a chord.
    public static let pressOrder: [Modifiers] = [.control, .option, .shift, .command]

    /// The symbols shown on a shortcut, in the order macOS prints them.
    public var symbols: String {
        var out = ""
        if contains(.control) { out += "⌃" }
        if contains(.option) { out += "⌥" }
        if contains(.shift) { out += "⇧" }
        if contains(.command) { out += "⌘" }
        return out
    }

    public var spokenName: String {
        var parts: [String] = []
        if contains(.control) { parts.append("Control") }
        if contains(.option) { parts.append("Option") }
        if contains(.shift) { parts.append("Shift") }
        if contains(.command) { parts.append("Command") }
        return parts.joined(separator: " ")
    }
}
