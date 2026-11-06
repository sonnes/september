import CoreGraphics

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

    /// A modifier that a chord can hold down.
    public struct Held: Sendable {
        public let modifier: Modifiers
        /// The name in panel JSON.
        public let name: String
        public let symbol: String
        public let spokenName: String
        /// The macOS `kVK_*` code posted to hold it down.
        public let virtualKey: UInt16
        public let eventFlag: CGEventFlags
    }

    /// Every modifier a chord can hold, in the order macOS prints them and a
    /// hand presses them. Caps lock is not here: macOS owns its toggle, so no
    /// app can post it.
    public static let held: [Held] = [
        Held(
            modifier: .function, name: "function", symbol: "fn", spokenName: "Function",
            virtualKey: 63, eventFlag: .maskSecondaryFn),
        Held(
            modifier: .control, name: "control", symbol: "⌃", spokenName: "Control",
            virtualKey: 59, eventFlag: .maskControl),
        Held(
            modifier: .option, name: "option", symbol: "⌥", spokenName: "Option",
            virtualKey: 58, eventFlag: .maskAlternate),
        Held(
            modifier: .shift, name: "shift", symbol: "⇧", spokenName: "Shift",
            virtualKey: 56, eventFlag: .maskShift),
        Held(
            modifier: .command, name: "command", symbol: "⌘", spokenName: "Command",
            virtualKey: 55, eventFlag: .maskCommand),
    ]

    /// The held modifiers in this set, in press order.
    public var heldKeys: [Held] { Modifiers.held.filter { contains($0.modifier) } }

    /// The key code posted to hold this single modifier, or nil for caps lock.
    public var virtualKey: UInt16? { heldKeys.count == 1 ? heldKeys[0].virtualKey : nil }

    /// The hint drawn on a shortcut, such as "⇧⌘".
    public var symbols: String { heldKeys.map(\.symbol).joined() }

    public var spokenName: String { heldKeys.map(\.spokenName).joined(separator: " ") }

    public var eventFlags: CGEventFlags {
        heldKeys.reduce(into: []) { $0.insert($1.eventFlag) }
    }

    /// Modifiers by their panel JSON names.
    public init(names: [String]) throws {
        var modifiers: Modifiers = []
        for name in names {
            guard let match = Modifiers.held.first(where: { $0.name == name }) else {
                throw PanelDecodingError.unknownModifier(name)
            }
            modifiers.insert(match.modifier)
        }
        self = modifiers
    }
}
