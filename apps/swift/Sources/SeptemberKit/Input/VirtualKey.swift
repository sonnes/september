/// Named virtual key codes we post directly rather than resolving through the
/// keyboard layout. Values are the macOS `kVK_*` constants.
public enum VirtualKey: UInt16, Sendable, Hashable, Codable, CaseIterable {
    case a = 0
    case s = 1
    case z = 6
    case x = 7
    case c = 8
    case v = 9
    case n = 45
    case f = 3
    case w = 13
    case o = 31
    case p = 35

    case `return` = 36
    case tab = 48
    case space = 49
    case delete = 51
    case escape = 53
    case forwardDelete = 117
    case home = 115
    case pageUp = 116
    case end = 119
    case pageDown = 121

    case left = 123
    case right = 124
    case down = 125
    case up = 126

    case f1 = 122
    case f2 = 120
    case f3 = 99
    case f4 = 118
    case f5 = 96
    case f6 = 97
    case f7 = 98
    case f8 = 100
    case f9 = 101
    case f10 = 109
    case f11 = 103
    case f12 = 111

    case minus = 27
    case equal = 24

    /// Looks a key up by the name used in panel JSON ("return", "pageDown").
    public init?(name: String) {
        guard let match = VirtualKey.allCases.first(where: { String(describing: $0) == name })
        else { return nil }
        self = match
    }

    /// F-keys by number, so the layout can build the function row in a loop.
    public static func function(_ number: Int) -> VirtualKey? {
        let keys: [VirtualKey] = [.f1, .f2, .f3, .f4, .f5, .f6, .f7, .f8, .f9, .f10, .f11, .f12]
        guard (1...keys.count).contains(number) else { return nil }
        return keys[number - 1]
    }

    /// How VoiceOver should say this key.
    public var spokenName: String {
        switch self {
        case .return: "Return"
        case .tab: "Tab"
        case .space: "Space"
        case .delete: "Delete"
        case .escape: "Escape"
        case .forwardDelete: "Forward Delete"
        case .left: "Left Arrow"
        case .right: "Right Arrow"
        case .up: "Up Arrow"
        case .down: "Down Arrow"
        case .home: "Home"
        case .end: "End"
        case .pageUp: "Page Up"
        case .pageDown: "Page Down"
        case .f1, .f2, .f3, .f4, .f5, .f6, .f7, .f8, .f9, .f10, .f11, .f12:
            "F" + String(VirtualKey.functionNumber(self) ?? 0)
        default: String(describing: self).uppercased()
        }
    }

    private static func functionNumber(_ key: VirtualKey) -> Int? {
        let keys: [VirtualKey] = [.f1, .f2, .f3, .f4, .f5, .f6, .f7, .f8, .f9, .f10, .f11, .f12]
        return keys.firstIndex(of: key).map { $0 + 1 }
    }

    /// The glyph shown on a shortcut hint (⌫, ↩, ⇥ …), or nil to use the name.
    public var symbol: String? {
        switch self {
        case .return: "↩"
        case .tab: "⇥"
        case .delete: "⌫"
        case .escape: "⎋"
        case .space: "␣"
        case .left: "←"
        case .right: "→"
        case .up: "↑"
        case .down: "↓"
        default: nil
        }
    }
}
