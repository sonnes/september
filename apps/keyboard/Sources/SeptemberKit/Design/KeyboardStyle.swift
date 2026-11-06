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

    public func tint(for row: KeyboardRow) -> ThemeColor {
        switch self {
        case .mono: Tokens.keyText
        case .rainbow:
            switch row {
            case .function: Tokens.rowFunction
            case .number: Tokens.rowNumber
            case .qwerty: Tokens.rowQwerty
            case .home: Tokens.rowHome
            case .shift: Tokens.rowShift
            case .bottom: Tokens.rowBottom
            }
        }
    }
}
