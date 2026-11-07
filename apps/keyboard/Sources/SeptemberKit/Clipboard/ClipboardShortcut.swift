/// The chords of Cut, Copy, and Paste.
public enum ClipboardShortcut {
    public static let cut = Shortcut(modifiers: .command, key: .character("x"))
    public static let copy = Shortcut(modifiers: .command, key: .character("c"))
    public static let paste = Shortcut(modifiers: .command, key: .character("v"))

    public static let all: Set<Shortcut> = [cut, copy, paste]
}
