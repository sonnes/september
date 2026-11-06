import Combine
import Foundation

/// The one place a key press turns into keystrokes. Views call `press`; the
/// sink turns the result into real events (or records them, in tests).
@MainActor
public final class KeyboardController: ObservableObject {
    @Published public var style: KeyboardStyle = .rainbow
    @Published public private(set) var modifiers = ModifierState()
    /// What we have typed since the last Return. Only shown when the app in
    /// front exposes no text of its own.
    @Published private var echo = ""
    /// The text field the app in front has focused, as far as accessibility
    /// can tell us.
    @Published public private(set) var focusedField: FocusedField?
    /// The name of the app in front. `nil` until an app reports its name.
    @Published public private(set) var frontmostAppName: String?
    @Published public private(set) var appPanel: PanelDefinition

    /// What the input bar shows: the focused field mirrored back, our own echo,
    /// or nothing for a password field.
    public var input: InputMirror { focusedField?.display ?? .local(text: echo) }

    public let panels: PanelStore

    private let sink: any KeystrokeSink
    private var keyCodeMap: KeyCodeMap

    public init(
        sink: any KeystrokeSink,
        panels: PanelStore,
        keyCodeMap: KeyCodeMap = SystemKeyboardLayout.currentMap()
    ) {
        self.sink = sink
        self.panels = panels
        self.keyCodeMap = keyCodeMap
        appPanel = panels.appPanel(forBundleID: nil)
    }

    /// Called when the user switches input source, with the map of the new
    /// layout.
    public func layoutChanged(to map: KeyCodeMap) {
        keyCodeMap = map
    }

    // MARK: - Pressing keys

    public func press(_ key: KeyDefinition) {
        switch key.action {
        case .modifier(let modifier):
            modifiers.tap(modifier)
        case .character(let character):
            type(character, secondary: key.secondaryLabel)
        case .virtual(let virtual):
            post(virtual, modifiers: modifiers.active.subtracting(.capsLock))
            modifiers.consume()
        }
    }

    public func perform(_ action: PanelAction) {
        switch action {
        case .shortcut(let shortcut):
            post(shortcut)
        case .text(let text):
            sink.type(text)
            append(text)
        }
        modifiers.consume()
    }

    public func clearEcho() {
        echo = ""
    }

    // MARK: - Mirroring the focused field

    /// Called when a different app comes to the front. Everything on screen
    /// belonged to the app we just left: the mirrored field is gone, and our
    /// own echo was typed into that app, not this one.
    public func appChanged(name: String?, bundleID: String?) {
        frontmostAppName = name
        appPanel = panels.appPanel(forBundleID: bundleID)
        focusedField = nil
        echo = ""
    }

    /// Called by the app whenever accessibility reports a different focused
    /// field, or new text in the one we are already watching.
    public func focusChanged(to field: FocusedField?) {
        focusedField = field
        if let name = field?.appName {
            frontmostAppName = name
        }
        // Whatever we typed belongs to the field we were on. A password must
        // never linger in our buffer.
        if isMirroring { echo = "" }
    }

    /// True while the field shows us its own text. Our echo is then a second,
    /// staler copy of it.
    private var isMirroring: Bool { focusedField?.display != nil }

    /// Our own text only stands in for fields that show us nothing, and never
    /// for a password.
    private func append(_ text: String) {
        guard !isMirroring else { return }
        echo += text
    }

    // MARK: - Turning presses into keystrokes

    private func type(_ base: String, secondary: String?) {
        let chord = modifiers.active.subtracting([.shift, .capsLock])

        if chord.isEmpty {
            // Plain typing: shift picks the secondary glyph on dual keys and
            // uppercases letters.
            let text: String
            if modifiers.active.contains(.shift), let secondary {
                text = secondary
            } else {
                text = modifiers.apply(to: base)
            }
            send(text: text)
            append(text)
        } else {
            // A chord (⌘C): send the base key with every active modifier, the
            // way a hardware keyboard would.
            var flags = chord
            if modifiers.active.contains(.shift) { flags.insert(.shift) }
            post(shortcut: base, modifiers: flags)
        }
        modifiers.consume()
    }

    private func send(text: String) {
        if let resolved = keyCodeMap.keystroke(for: text) {
            sink.post(
                Keystroke.events(virtualKey: resolved.virtualKey, modifiers: resolved.modifiers)
            )
        } else {
            // Nothing on this layout produces the character — type it directly.
            sink.type(text)
        }
    }

    /// Posts a named key. Without a chord, the echo follows what the key
    /// does to the text.
    private func post(_ virtual: VirtualKey, modifiers: Modifiers) {
        sink.post(Keystroke.events(virtualKey: virtual.rawValue, modifiers: modifiers))
        guard !isMirroring, modifiers.subtracting(.shift).isEmpty else { return }
        switch virtual {
        case .delete: echo = String(echo.dropLast())
        case .return: echo = ""
        case .space: echo += " "
        default: break
        }
    }

    private func post(shortcut character: String, modifiers: Modifiers) {
        guard let resolved = keyCodeMap.shortcutKeystroke(for: character) else { return }
        sink.post(
            Keystroke.events(
                virtualKey: resolved.virtualKey,
                modifiers: modifiers.union(resolved.modifiers)
            )
        )
    }

    private func post(_ shortcut: Shortcut) {
        switch shortcut.key {
        case .virtual(let virtual):
            post(virtual, modifiers: shortcut.modifiers)
        case .character(let character):
            post(shortcut: character, modifiers: shortcut.modifiers)
        }
    }
}
