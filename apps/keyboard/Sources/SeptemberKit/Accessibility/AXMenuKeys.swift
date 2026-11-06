/// The keys of a menu item, as accessibility reports them: the attributes
/// `AXMenuItemCmdChar`, `AXMenuItemCmdVirtualKey`, and `AXMenuItemCmdModifiers`.
public struct AXMenuKeys: Equatable, Hashable, Sendable {
    /// The character of the chord, such as "L". Nil for a key with no character.
    public let character: String?
    /// The `kVK_*` code, for a key with no character.
    public let virtualKey: UInt16?
    /// The modifier mask of the menu item. Command is on unless the mask says
    /// otherwise.
    public let modifiers: Int

    public init(character: String?, virtualKey: UInt16?, modifiers: Int) {
        self.character = character
        self.virtualKey = virtualKey
        self.modifiers = modifiers
    }

    // The bits of `AXMenuItemCmdModifiers`, from `kAXMenuItemModifier*`.
    private static let shiftBit = 1 << 0
    private static let optionBit = 1 << 1
    private static let controlBit = 1 << 2
    private static let noCommandBit = 1 << 3

    /// The chord that presses the menu item, or nil if the keys name no key.
    public var shortcut: Shortcut? {
        var held: Modifiers = []
        if modifiers & AXMenuKeys.shiftBit != 0 { held.insert(.shift) }
        if modifiers & AXMenuKeys.optionBit != 0 { held.insert(.option) }
        if modifiers & AXMenuKeys.controlBit != 0 { held.insert(.control) }
        if modifiers & AXMenuKeys.noCommandBit == 0 { held.insert(.command) }

        if let character, character.count == 1,
            character.unicodeScalars.allSatisfy({ $0.value > 32 && $0.value != 127 })
        {
            return Shortcut(modifiers: held, key: .character(character.lowercased()))
        }
        if let virtualKey, let key = VirtualKey(rawValue: virtualKey) {
            return Shortcut(modifiers: held, key: .virtual(key))
        }
        return nil
    }
}
