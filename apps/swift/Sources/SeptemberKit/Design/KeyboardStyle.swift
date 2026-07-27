/// The rows of the main keyboard, in visual order. Rainbow tints key by row.
public enum KeyboardRow: String, Sendable, Hashable, CaseIterable {
    case function
    case number
    case qwerty
    case home
    case shift
    case bottom
}

/// The two keyboard variants in the design system.
public enum KeyboardStyle: String, Sendable, CaseIterable {
    case rainbow
    case mono

    public var drawsRowAccent: Bool { self == .rainbow }

    public func tint(for row: KeyboardRow) -> RGBA {
        switch self {
        case .mono:
            return Tokens.keyText
        case .rainbow:
            switch row {
            case .function: return RGBA(hex: 0xFF6B7A)
            case .number: return RGBA(hex: 0xFF9F4A)
            case .qwerty: return RGBA(hex: 0xF5D06B)
            case .home: return RGBA(hex: 0x5CD6A0)
            case .shift: return RGBA(hex: 0x5AC8FA)
            case .bottom: return RGBA(hex: 0x8B8BFF)
            }
        }
    }
}
