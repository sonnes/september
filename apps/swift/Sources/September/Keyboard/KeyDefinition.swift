import Foundation

enum KeyWidth: CGFloat {
    case standard = 44
    case wide = 56
    case wider = 72
    case extraWide = 90
    case space = 260
}

struct KeyDefinition: Identifiable {
    let id = UUID()
    let label: String
    let shiftLabel: String?
    let keyCode: UInt16
    let width: KeyWidth
    let isModifier: Bool

    var isDualLabel: Bool { shiftLabel != nil }

    init(
        _ label: String,
        shift: String? = nil,
        code: UInt16,
        width: KeyWidth = .standard,
        isModifier: Bool = false
    ) {
        self.label = label
        self.shiftLabel = shift
        self.keyCode = code
        self.width = width
        self.isModifier = isModifier
    }
}

enum KeyboardLayout {
    static let numberRow: [KeyDefinition] = [
        KeyDefinition("`", shift: "~", code: KeyCodes.grave),
        KeyDefinition("1", shift: "!", code: KeyCodes.one),
        KeyDefinition("2", shift: "@", code: KeyCodes.two),
        KeyDefinition("3", shift: "#", code: KeyCodes.three),
        KeyDefinition("4", shift: "$", code: KeyCodes.four),
        KeyDefinition("5", shift: "%", code: KeyCodes.five),
        KeyDefinition("6", shift: "^", code: KeyCodes.six),
        KeyDefinition("7", shift: "&", code: KeyCodes.seven),
        KeyDefinition("8", shift: "*", code: KeyCodes.eight),
        KeyDefinition("9", shift: "(", code: KeyCodes.nine),
        KeyDefinition("0", shift: ")", code: KeyCodes.zero),
        KeyDefinition("-", shift: "_", code: KeyCodes.minus),
        KeyDefinition("=", shift: "+", code: KeyCodes.equal),
        KeyDefinition("⌫", code: KeyCodes.delete, width: .wide),
    ]

    static let qwertyRow: [KeyDefinition] = [
        KeyDefinition("⇥", code: KeyCodes.tab, width: .wide, isModifier: true),
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
        KeyDefinition("[", shift: "{", code: KeyCodes.leftBracket),
        KeyDefinition("]", shift: "}", code: KeyCodes.rightBracket),
        KeyDefinition("\\", shift: "|", code: KeyCodes.backslash),
    ]

    static let asdfRow: [KeyDefinition] = [
        KeyDefinition("⇪", code: KeyCodes.capsLock, width: .wider, isModifier: true),
        KeyDefinition("a", code: KeyCodes.a),
        KeyDefinition("s", code: KeyCodes.s),
        KeyDefinition("d", code: KeyCodes.d),
        KeyDefinition("f", code: KeyCodes.f),
        KeyDefinition("g", code: KeyCodes.g),
        KeyDefinition("h", code: KeyCodes.h),
        KeyDefinition("j", code: KeyCodes.j),
        KeyDefinition("k", code: KeyCodes.k),
        KeyDefinition("l", code: KeyCodes.l),
        KeyDefinition(";", shift: ":", code: KeyCodes.semicolon),
        KeyDefinition("'", shift: "\"", code: KeyCodes.quote),
        KeyDefinition("⏎", code: KeyCodes.returnKey, width: .wider),
    ]

    static let zxcvRow: [KeyDefinition] = [
        KeyDefinition("⇧", code: KeyCodes.shift, width: .extraWide, isModifier: true),
        KeyDefinition("z", code: KeyCodes.z),
        KeyDefinition("x", code: KeyCodes.x),
        KeyDefinition("c", code: KeyCodes.c),
        KeyDefinition("v", code: KeyCodes.v),
        KeyDefinition("b", code: KeyCodes.b),
        KeyDefinition("n", code: KeyCodes.n),
        KeyDefinition("m", code: KeyCodes.m),
        KeyDefinition(",", shift: "<", code: KeyCodes.comma),
        KeyDefinition(".", shift: ">", code: KeyCodes.period),
        KeyDefinition("/", shift: "?", code: KeyCodes.slash),
        KeyDefinition("⇧", code: KeyCodes.rightShift, width: .extraWide, isModifier: true),
    ]

    static let modifierRow: [KeyDefinition] = [
        KeyDefinition("fn", code: KeyCodes.function, width: .standard, isModifier: true),
        KeyDefinition("⌃", code: KeyCodes.control, width: .standard, isModifier: true),
        KeyDefinition("⌥", code: KeyCodes.option, width: .standard, isModifier: true),
        KeyDefinition("⌘", code: KeyCodes.command, width: .wide, isModifier: true),
        KeyDefinition("", code: KeyCodes.space, width: .space),
        KeyDefinition("⌘", code: KeyCodes.rightCommand, width: .wide, isModifier: true),
        KeyDefinition("⌥", code: KeyCodes.rightOption, width: .standard, isModifier: true),
    ]

    static let allRows: [[KeyDefinition]] = [
        numberRow, qwertyRow, asdfRow, zxcvRow, modifierRow
    ]
}
