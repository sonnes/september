import Foundation

/// Keyboard row definitions for full QWERTY layout.
/// Row index is used by KeyboardStyle for per-row accent colors.
enum KeyboardLayout {

    // MARK: Row 0 — Function Row (Esc, F1-F12)

    static let functionRow: [KeyDefinition] = [
        KeyDefinition("esc", code: KeyCodes.escape, width: .wide, type: .function),
        KeyDefinition("F1", code: KeyCodes.f1, width: .wide, type: .function),
        KeyDefinition("F2", code: KeyCodes.f2, width: .wide, type: .function),
        KeyDefinition("F3", code: KeyCodes.f3, width: .wide, type: .function),
        KeyDefinition("F4", code: KeyCodes.f4, width: .wide, type: .function),
        KeyDefinition("F5", code: KeyCodes.f5, width: .wide, type: .function),
        KeyDefinition("F6", code: KeyCodes.f6, width: .wide, type: .function),
        KeyDefinition("F7", code: KeyCodes.f7, width: .wide, type: .function),
        KeyDefinition("F8", code: KeyCodes.f8, width: .wide, type: .function),
        KeyDefinition("F9", code: KeyCodes.f9, width: .wide, type: .function),
        KeyDefinition("F10", code: KeyCodes.f10, width: .wide, type: .function),
        KeyDefinition("F11", code: KeyCodes.f11, width: .wide, type: .function),
        KeyDefinition("F12", code: KeyCodes.f12, width: .wide, type: .function),
        KeyDefinition("⌦", code: KeyCodes.forwardDelete, width: .wide, type: .function),
    ]

    // MARK: Row 1 — Number Row (dual labels)

    static let numberRow: [KeyDefinition] = [
        KeyDefinition("`", shift: "~", code: KeyCodes.grave, type: .dual),
        KeyDefinition("1", shift: "!", code: KeyCodes.one, type: .dual),
        KeyDefinition("2", shift: "@", code: KeyCodes.two, type: .dual),
        KeyDefinition("3", shift: "#", code: KeyCodes.three, type: .dual),
        KeyDefinition("4", shift: "$", code: KeyCodes.four, type: .dual),
        KeyDefinition("5", shift: "%", code: KeyCodes.five, type: .dual),
        KeyDefinition("6", shift: "^", code: KeyCodes.six, type: .dual),
        KeyDefinition("7", shift: "&", code: KeyCodes.seven, type: .dual),
        KeyDefinition("8", shift: "*", code: KeyCodes.eight, type: .dual),
        KeyDefinition("9", shift: "(", code: KeyCodes.nine, type: .dual),
        KeyDefinition("0", shift: ")", code: KeyCodes.zero, type: .dual),
        KeyDefinition("-", shift: "_", code: KeyCodes.minus, type: .dual),
        KeyDefinition("=", shift: "+", code: KeyCodes.equal, type: .dual),
        KeyDefinition("⌫", code: KeyCodes.delete, width: .wide, type: .special),
    ]

    // MARK: Row 2 — QWERTY Row

    static let qwertyRow: [KeyDefinition] = [
        KeyDefinition("⇥", code: KeyCodes.tab, width: .wide, type: .special),
        KeyDefinition("q", code: KeyCodes.q),
        KeyDefinition("w", code: KeyCodes.w),
        KeyDefinition("e", code: KeyCodes.e),
        KeyDefinition("r", code: KeyCodes.r),
        KeyDefinition("t", code: KeyCodes.t),
        KeyDefinition("y", code: KeyCodes.y),
        KeyDefinition("u", code: KeyCodes.u),
        KeyDefinition("i", code: KeyCodes.i),
        KeyDefinition("o", code: KeyCodes.o),
        KeyDefinition("p", code: KeyCodes.p),
        KeyDefinition("[", shift: "{", code: KeyCodes.leftBracket, type: .dual),
        KeyDefinition("]", shift: "}", code: KeyCodes.rightBracket, type: .dual),
        KeyDefinition("\\", shift: "|", code: KeyCodes.backslash, type: .dual),
    ]

    // MARK: Row 3 — Home Row

    static let asdfRow: [KeyDefinition] = [
        KeyDefinition("⇪", code: KeyCodes.capsLock, width: .wider, isModifier: true, type: .special),
        KeyDefinition("a", code: KeyCodes.a),
        KeyDefinition("s", code: KeyCodes.s),
        KeyDefinition("d", code: KeyCodes.d),
        KeyDefinition("f", code: KeyCodes.f),
        KeyDefinition("g", code: KeyCodes.g),
        KeyDefinition("h", code: KeyCodes.h),
        KeyDefinition("j", code: KeyCodes.j),
        KeyDefinition("k", code: KeyCodes.k),
        KeyDefinition("l", code: KeyCodes.l),
        KeyDefinition(";", shift: ":", code: KeyCodes.semicolon, type: .dual),
        KeyDefinition("'", shift: "\"", code: KeyCodes.quote, type: .dual),
        KeyDefinition("⏎", code: KeyCodes.returnKey, width: .wider, type: .special),
    ]

    // MARK: Row 4 — Bottom Row

    static let zxcvRow: [KeyDefinition] = [
        KeyDefinition("⇧", code: KeyCodes.shift, width: .extraWide, isModifier: true, type: .special),
        KeyDefinition("z", code: KeyCodes.z),
        KeyDefinition("x", code: KeyCodes.x),
        KeyDefinition("c", code: KeyCodes.c),
        KeyDefinition("v", code: KeyCodes.v),
        KeyDefinition("b", code: KeyCodes.b),
        KeyDefinition("n", code: KeyCodes.n),
        KeyDefinition("m", code: KeyCodes.m),
        KeyDefinition(",", shift: "<", code: KeyCodes.comma, type: .dual),
        KeyDefinition(".", shift: ">", code: KeyCodes.period, type: .dual),
        KeyDefinition("/", shift: "?", code: KeyCodes.slash, type: .dual),
        KeyDefinition("⇧", code: KeyCodes.rightShift, width: .extraWide, isModifier: true, type: .special),
    ]

    // MARK: Row 5 — Modifier Row

    static let modifierRow: [KeyDefinition] = [
        KeyDefinition("fn", code: KeyCodes.function, isModifier: true, type: .special),
        KeyDefinition("⌃", code: KeyCodes.control, isModifier: true, type: .special),
        KeyDefinition("⌥", code: KeyCodes.option, isModifier: true, type: .special),
        KeyDefinition("⌘", code: KeyCodes.command, width: .wide, isModifier: true, type: .special),
        KeyDefinition("", code: KeyCodes.space, width: .space),
        KeyDefinition("⌘", code: KeyCodes.rightCommand, width: .wide, isModifier: true, type: .special),
        KeyDefinition("⌥", code: KeyCodes.rightOption, isModifier: true, type: .special),
    ]

    // MARK: All Rows

    static let allRows: [[KeyDefinition]] = [
        functionRow, numberRow, qwertyRow, asdfRow, zxcvRow, modifierRow,
    ]
}
