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

    /// The rainbow hues are the design system's, which assume a dark key. On a
    /// white key the same hues wash out, so the light column is each one taken
    /// down to hold its contrast — same hue order, same feel.
    public func tint(for row: KeyboardRow) -> ThemeColor {
        switch self {
        case .mono:
            return Tokens.keyText
        case .rainbow:
            switch row {
            case .function:
                return ThemeColor(light: RGBA(hex: 0xC01829), dark: RGBA(hex: 0xFF6B7A))
            case .number:
                return ThemeColor(light: RGBA(hex: 0xA35400), dark: RGBA(hex: 0xFF9F4A))
            case .qwerty:
                return ThemeColor(light: RGBA(hex: 0x866200), dark: RGBA(hex: 0xF5D06B))
            case .home:
                return ThemeColor(light: RGBA(hex: 0x0F7A48), dark: RGBA(hex: 0x5CD6A0))
            case .shift:
                return ThemeColor(light: RGBA(hex: 0x0A6E96), dark: RGBA(hex: 0x5AC8FA))
            case .bottom:
                return ThemeColor(light: RGBA(hex: 0x4A46D6), dark: RGBA(hex: 0x8B8BFF))
            }
        }
    }
}
