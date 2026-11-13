/// Keys that type no character, posted by their macOS `kVK_*` code. Keys that
/// type a character go through `KeyCodeMap`, so they follow the user's layout.
public enum VirtualKey: UInt16, Sendable, Hashable, CaseIterable {
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

    private static let functionKeys: [VirtualKey] = [
        .f1, .f2, .f3, .f4, .f5, .f6, .f7, .f8, .f9, .f10, .f11, .f12,
    ]

    /// Looks a key up by the name used in panel JSON ("return", "pageDown").
    public init?(name: String) {
        guard let match = VirtualKey.allCases.first(where: { String(describing: $0) == name })
        else { return nil }
        self = match
    }

    public static func function(_ number: Int) -> VirtualKey? {
        guard (1...functionKeys.count).contains(number) else { return nil }
        return functionKeys[number - 1]
    }

    public var spokenName: String {
        switch self {
        case .return: return "Return"
        case .tab: return "Tab"
        case .space: return "Space"
        case .delete: return "Delete"
        case .escape: return "Escape"
        case .forwardDelete: return "Forward Delete"
        case .left: return "Left Arrow"
        case .right: return "Right Arrow"
        case .up: return "Up Arrow"
        case .down: return "Down Arrow"
        case .home: return "Home"
        case .end: return "End"
        case .pageUp: return "Page Up"
        case .pageDown: return "Page Down"
        case .f1, .f2, .f3, .f4, .f5, .f6, .f7, .f8, .f9, .f10, .f11, .f12:
            return "F\(VirtualKey.functionKeys.firstIndex(of: self)! + 1)"
        }
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
        case .pageUp: "⇞"
        case .pageDown: "⇟"
        default: nil
        }
    }

    /// Keys that repeat while held, as on a hardware keyboard.
    public var repeatsWhenHeld: Bool {
        switch self {
        case .delete, .forwardDelete, .left, .right, .up, .down, .space: true
        default: false
        }
    }
}
