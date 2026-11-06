/// The Mac key code of each key position, by its HID usage on the keyboard
/// page (0x07). The Accessibility Keyboard saves some keys as a USB key code,
/// `0x07_00uu`. This maps a position, not a character. The character comes
/// from the layout of the user.
enum HIDKeyCodes {
    static let keyboardPage = 0x07

    static func macKeyCode(forUSB code: Int) -> UInt16? {
        guard code >> 16 == keyboardPage else { return nil }
        return byUsage[code & 0xFFFF]
    }

    private static let byUsage: [Int: UInt16] = [
        // Letters a to z.
        0x04: 0, 0x05: 11, 0x06: 8, 0x07: 2, 0x08: 14, 0x09: 3, 0x0A: 5, 0x0B: 4,
        0x0C: 34, 0x0D: 38, 0x0E: 40, 0x0F: 37, 0x10: 46, 0x11: 45, 0x12: 31, 0x13: 35,
        0x14: 12, 0x15: 15, 0x16: 1, 0x17: 17, 0x18: 32, 0x19: 9, 0x1A: 13, 0x1B: 7,
        0x1C: 16, 0x1D: 6,
        // Digits 1 to 0.
        0x1E: 18, 0x1F: 19, 0x20: 20, 0x21: 21, 0x22: 23, 0x23: 22, 0x24: 26, 0x25: 28,
        0x26: 25, 0x27: 29,
        // Return, escape, delete, tab, space, and the punctuation keys.
        0x28: 36, 0x29: 53, 0x2A: 51, 0x2B: 48, 0x2C: 49, 0x2D: 27, 0x2E: 24, 0x2F: 33,
        0x30: 30, 0x31: 42, 0x32: 42, 0x33: 41, 0x34: 39, 0x35: 50, 0x36: 43, 0x37: 47,
        0x38: 44, 0x39: 57, 0x64: 10,
        // F1 to F12.
        0x3A: 122, 0x3B: 120, 0x3C: 99, 0x3D: 118, 0x3E: 96, 0x3F: 97, 0x40: 98,
        0x41: 100, 0x42: 101, 0x43: 109, 0x44: 103, 0x45: 111,
        // Home, page up, forward delete, end, page down, and the arrows.
        0x4A: 115, 0x4B: 116, 0x4C: 117, 0x4D: 119, 0x4E: 121, 0x4F: 124, 0x50: 123,
        0x51: 125, 0x52: 126,
        // Control, shift, option, and command, left then right.
        0xE0: 59, 0xE1: 56, 0xE2: 58, 0xE3: 55, 0xE4: 62, 0xE5: 60, 0xE6: 61, 0xE7: 54,
    ]
}
