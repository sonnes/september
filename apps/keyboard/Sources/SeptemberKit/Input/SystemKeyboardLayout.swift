import Carbon.HIToolbox
import Foundation

/// Builds a `KeyCodeMap` from the keyboard layout the user actually has
/// selected, so Keyboard types the right characters on AZERTY, Dvorak, etc.
public enum SystemKeyboardLayout {
    public static func currentMap() -> KeyCodeMap {
        KeyCodeMap(
            probe: probe(TISCopyCurrentKeyboardLayoutInputSource()),
            shortcutProbe: probe(TISCopyCurrentASCIICapableKeyboardLayoutInputSource())
        )
    }

    private static func probe(_ source: Unmanaged<TISInputSource>?)
        -> (UInt16, Modifiers) -> String?
    {
        guard let data = layoutData(source) else { return { _, _ in nil } }
        return { code, modifiers in
            translate(keyCode: code, modifiers: modifiers, layoutData: data)
        }
    }

    /// Fires whenever the user switches input source; the caller rebuilds.
    public static let inputSourceChanged = Notification.Name(
        kTISNotifySelectedKeyboardInputSourceChanged as String
    )

    private static func layoutData(_ source: Unmanaged<TISInputSource>?) -> Data? {
        guard let source = source?.takeRetainedValue(),
            let pointer = TISGetInputSourceProperty(source, kTISPropertyUnicodeKeyLayoutData)
        else { return nil }
        return Unmanaged<CFData>.fromOpaque(pointer).takeUnretainedValue() as Data
    }

    private static func translate(keyCode: UInt16, modifiers: Modifiers, layoutData: Data)
        -> String?
    {
        var carbonModifiers: UInt32 = 0
        if modifiers.contains(.shift) { carbonModifiers |= UInt32(shiftKey >> 8) }
        if modifiers.contains(.option) { carbonModifiers |= UInt32(optionKey >> 8) }

        var deadKeyState: UInt32 = 0
        var length = 0
        var characters = [UniChar](repeating: 0, count: 4)

        let status = layoutData.withUnsafeBytes { buffer -> OSStatus in
            guard let base = buffer.baseAddress else { return OSStatus(paramErr) }
            let layout = base.assumingMemoryBound(to: UCKeyboardLayout.self)
            return UCKeyTranslate(
                layout,
                keyCode,
                UInt16(kUCKeyActionDown),
                carbonModifiers,
                UInt32(LMGetKbdType()),
                OptionBits(kUCKeyTranslateNoDeadKeysBit),
                &deadKeyState,
                characters.count,
                &length,
                &characters
            )
        }

        guard status == noErr, length > 0 else { return nil }
        let result = String(utf16CodeUnits: characters, count: length)
        // Control characters (return, tab, escape) are posted as virtual keys,
        // never resolved through the layout.
        return result.unicodeScalars.allSatisfy { $0.value >= 32 } ? result : nil
    }
}
