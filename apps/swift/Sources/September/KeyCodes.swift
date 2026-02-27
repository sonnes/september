import Foundation

enum KeyCodes {
    // Letters (US QWERTY layout)
    static let a: UInt16 = 0x00
    static let s: UInt16 = 0x01
    static let d: UInt16 = 0x02
    static let f: UInt16 = 0x03
    static let h: UInt16 = 0x04
    static let g: UInt16 = 0x05
    static let z: UInt16 = 0x06
    static let x: UInt16 = 0x07
    static let c: UInt16 = 0x08
    static let v: UInt16 = 0x09
    static let b: UInt16 = 0x0B
    static let q: UInt16 = 0x0C
    static let w: UInt16 = 0x0D
    static let e: UInt16 = 0x0E
    static let r: UInt16 = 0x0F
    static let y: UInt16 = 0x10
    static let t: UInt16 = 0x11
    static let o: UInt16 = 0x1F
    static let u: UInt16 = 0x20
    static let i: UInt16 = 0x22
    static let p: UInt16 = 0x23
    static let l: UInt16 = 0x25
    static let j: UInt16 = 0x26
    static let k: UInt16 = 0x28
    static let n: UInt16 = 0x2D
    static let m: UInt16 = 0x2E

    // Numbers
    static let one: UInt16 = 0x12
    static let two: UInt16 = 0x13
    static let three: UInt16 = 0x14
    static let four: UInt16 = 0x15
    static let five: UInt16 = 0x17
    static let six: UInt16 = 0x16
    static let seven: UInt16 = 0x1A
    static let eight: UInt16 = 0x1C
    static let nine: UInt16 = 0x19
    static let zero: UInt16 = 0x1D

    // Punctuation & Symbols
    static let grave: UInt16 = 0x32         // ` ~
    static let minus: UInt16 = 0x1B         // - _
    static let equal: UInt16 = 0x18         // = +
    static let leftBracket: UInt16 = 0x21   // [ {
    static let rightBracket: UInt16 = 0x1E  // ] }
    static let backslash: UInt16 = 0x2A     // \ |
    static let semicolon: UInt16 = 0x29     // ; :
    static let quote: UInt16 = 0x27         // ' "
    static let comma: UInt16 = 0x2B         // , <
    static let period: UInt16 = 0x2F        // . >
    static let slash: UInt16 = 0x2C         // / ?

    // Special Keys
    static let returnKey: UInt16 = 0x24
    static let tab: UInt16 = 0x30
    static let space: UInt16 = 0x31
    static let delete: UInt16 = 0x33
    static let escape: UInt16 = 0x35
    static let capsLock: UInt16 = 0x39

    // Modifiers
    static let command: UInt16 = 0x37
    static let shift: UInt16 = 0x38
    static let option: UInt16 = 0x3A
    static let control: UInt16 = 0x3B
    static let rightShift: UInt16 = 0x3C
    static let rightOption: UInt16 = 0x3D
    static let rightCommand: UInt16 = 0x36
    static let rightControl: UInt16 = 0x3E
    static let function: UInt16 = 0x3F

    // Navigation Keys
    static let pageUp: UInt16 = 0x74
    static let pageDown: UInt16 = 0x79
    static let home: UInt16 = 0x73
    static let end: UInt16 = 0x77
    static let forwardDelete: UInt16 = 0x75

    // Arrow Keys
    static let leftArrow: UInt16 = 0x7B
    static let rightArrow: UInt16 = 0x7C
    static let downArrow: UInt16 = 0x7D
    static let upArrow: UInt16 = 0x7E
}
