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
    private var echo = "" {
        didSet { refreshInput() }
    }
    /// What the input bar shows: the focused field mirrored back, our own echo,
    /// or nothing for a password field.
    @Published public private(set) var input: InputMirror = .local(text: "")
    /// The text field the app in front has focused, as far as accessibility
    /// can tell us.
    @Published public private(set) var focusedField: FocusedField?
    /// The name of the app in front. `nil` until an app reports its name.
    @Published public private(set) var frontmostAppName: String?
    /// True after a private text button typed into the focused field, until
    /// the focus moves. The bar hides the field, and the controller keeps none
    /// of its text, so predictions and learning never see it.
    @Published public private(set) var isFieldPrivate = false
    /// Where private text buttons keep their text.
    public var privateTexts: any PrivateTextStore = KeychainPrivateTextStore()
    /// In Talk mode, the keys type into `talk` and the app in front gets no
    /// events.
    @Published public var mode: KeyboardMode = .type {
        didSet { accentChoices = [] }
    }
    /// The accents of a held letter, shown over the word row until the user
    /// presses a key. Empty when no accents show.
    @Published public private(set) var accentChoices: [String] = []
    public var accents = AccentTable.english
    public let talk: TalkSession
    /// Called when the user submits the text in Type mode: a press on Return
    /// with no modifier.
    public var onSubmit: (() -> Void)?

    public let panels: PanelStore

    private let sink: any KeystrokeSink
    /// The last key pressed, with the modifiers it had, so a repeat types
    /// the same thing after the latched modifiers are used up.
    private var lastPress: (id: String, modifiers: ModifierState)?
    private var keyCodeMap: KeyCodeMap

    public init(
        sink: any KeystrokeSink,
        panels: PanelStore,
        keyCodeMap: KeyCodeMap = SystemKeyboardLayout.currentMap(),
        talk: TalkSession = TalkSession()
    ) {
        self.talk = talk
        self.sink = sink
        self.panels = panels
        self.keyCodeMap = keyCodeMap
    }

    /// Called when the user switches input source, with the map of the new
    /// layout.
    public func layoutChanged(to map: KeyCodeMap) {
        keyCodeMap = map
    }

    // MARK: - Pressing keys

    public func press(_ key: KeyDefinition) {
        accentChoices = []
        lastPress = (key.id, modifiers)
        apply(key, modifiers: &modifiers)
    }

    /// Types `key` again while the user holds it, with the modifiers of its
    /// first press.
    public func repeatPress(_ key: KeyDefinition) {
        guard let lastPress, lastPress.id == key.id else { return press(key) }
        var held = lastPress.modifiers
        apply(key, modifiers: &held)
    }

    /// What `key` does while the user holds it. Call this before `press`,
    /// because a press uses up the latched modifiers.
    public func holdBehavior(for key: KeyDefinition) -> HoldBehavior {
        switch key.action {
        case .modifier:
            return .once
        case .virtual(let virtual):
            return virtual.repeatsWhenHeld ? .repeats : .once
        case .character(let character):
            guard modifiers.active.subtracting([.shift, .capsLock]).isEmpty else { return .once }
            guard character.count == 1, character.first?.isLetter == true else { return .repeats }
            return .letter(choices: accents.choices(for: modifiers.apply(to: character)))
        }
    }

    /// Shows the accents of a held letter.
    public func showAccents(_ choices: [String]) {
        accentChoices = choices
    }

    /// Replaces the held letter with `choice`, as the press and hold menu of
    /// macOS does.
    public func chooseAccent(_ choice: String) {
        accentChoices = []
        if mode == .talk { return talk.replaceLast(with: choice) }
        post(.delete, modifiers: [])
        send(text: choice)
        append(choice)
    }

    private func apply(_ key: KeyDefinition, modifiers: inout ModifierState) {
        if mode == .talk { return talk.press(key, modifiers: &modifiers) }
        switch key.action {
        case .modifier(let modifier):
            modifiers.tap(modifier)
        case .character(let character):
            type(character, secondary: key.secondaryLabel, modifiers: &modifiers)
        case .virtual(let virtual):
            let flags = modifiers.active.subtracting(.capsLock)
            if virtual == .return, flags.isEmpty { onSubmit?() }
            post(virtual, modifiers: flags)
            modifiers.consume()
        }
    }

    public func perform(_ action: PanelAction) {
        accentChoices = []
        if mode == .talk { return talk.perform(action, modifiers: &modifiers) }
        switch action {
        case .shortcut(let shortcut):
            guard post(shortcut) else { return }
        case .sequence(let steps):
            for step in steps {
                guard post(step) else { return }
            }
        case .text(let text):
            sink.type(text)
            append(text)
        case .privateText(let id):
            guard let text = try? privateTexts.text(for: id) else { break }
            sink.type(text)
            hideField()
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
    public func appChanged(name: String?) {
        frontmostAppName = name
        accentChoices = []
        focusedField = nil
        isFieldPrivate = false
        echo = ""
    }

    /// Called when focus lands on a different element. Private text stays in
    /// the field it went into, so the bar can show the new field.
    public func focusMoved() {
        guard isFieldPrivate else { return }
        isFieldPrivate = false
        echo = ""
    }

    private func hideField() {
        isFieldPrivate = true
        focusedField = focusedField?.withoutText
        echo = ""
    }

    /// Called by the app whenever accessibility reports a different focused
    /// field, or new text in the one we are already watching.
    public func focusChanged(to field: FocusedField?) {
        focusedField = isFieldPrivate ? field?.withoutText : field
        if let name = field?.appName {
            frontmostAppName = name
        }
        // Whatever we typed belongs to the field we were on; a password must
        // never linger in our buffer.
        if field?.display != nil { echo = "" } else { refreshInput() }
    }

    /// True while the field itself is showing us its text — our echo would only
    /// be a second, staler copy of it.
    private var isMirroring: Bool { focusedField?.display != nil }

    /// Our own text only stands in for fields that show us nothing, and never
    /// for a password.
    private func append(_ text: String) {
        guard !isMirroring, !isFieldPrivate else { return }
        echo += text
    }

    private func refreshInput() {
        input = isFieldPrivate ? .secure : focusedField?.display ?? .local(text: echo)
    }

    // MARK: - Turning presses into keystrokes

    private func type(_ base: String, secondary: String?, modifiers: inout ModifierState) {
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
            guard post(shortcut: base, modifiers: flags) else { return }
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
        guard !isMirroring, !isFieldPrivate, modifiers.subtracting(.shift).isEmpty else { return }
        switch virtual {
        case .delete: echo = String(echo.dropLast())
        case .return: echo = ""
        case .space: echo += " "
        default: break
        }
    }

    /// Returns false, and beeps, when no layout has a key for `character`.
    /// macOS uses the ASCII-capable layout for a shortcut on a layout without
    /// Latin letters.
    private func post(shortcut character: String, modifiers: Modifiers) -> Bool {
        guard let resolved = keyCodeMap.shortcutKeystroke(for: character) else {
            sink.beep()
            return false
        }
        sink.post(
            Keystroke.events(
                virtualKey: resolved.virtualKey,
                modifiers: modifiers.union(resolved.modifiers)
            )
        )
        return true
    }

    private func post(_ shortcut: Shortcut) -> Bool {
        switch shortcut.key {
        case .virtual(let virtual):
            post(virtual, modifiers: shortcut.modifiers)
            return true
        case .character(let character):
            return post(shortcut: character, modifiers: shortcut.modifiers)
        }
    }
}
