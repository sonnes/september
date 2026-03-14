import Foundation

// MARK: - Key Types

enum KeyType: Sendable {
    case standard   // 48×48 — alphanumeric
    case special    // 60×48 — modifiers (shift, tab, delete, return, caps)
    case function   // 60×32 — function row (esc, F1-F12)
    case dual       // 48×48 — number row with shift symbol
}

// MARK: - Key Widths

enum KeyWidth: CGFloat, Sendable {
    case standard = 48
    case wide = 60
    case wider = 72
    case extraWide = 90
    case space = 260
}

// MARK: - Key Definition

struct KeyDefinition: Identifiable, Sendable {
    let id = UUID()
    let label: String
    let shiftLabel: String?
    let keyCode: UInt16
    let width: KeyWidth
    let isModifier: Bool
    let keyType: KeyType

    var isDualLabel: Bool { shiftLabel != nil }

    var height: CGFloat {
        keyType == .function ? 32 : 48
    }

    init(
        _ label: String,
        shift: String? = nil,
        code: UInt16,
        width: KeyWidth = .standard,
        isModifier: Bool = false,
        type: KeyType = .standard
    ) {
        self.label = label
        self.shiftLabel = shift
        self.keyCode = code
        self.width = width
        self.isModifier = isModifier
        self.keyType = type
    }
}
