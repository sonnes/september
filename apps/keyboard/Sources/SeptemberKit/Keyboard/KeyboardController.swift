import Combine
import Foundation

/// The one place a key press turns into keystrokes. Views call `press`; the
/// sink turns the result into real events (or records them, in tests).
@MainActor
public final class KeyboardController: ObservableObject {
    @Published public var style: KeyboardStyle = .rainbow
    @Published public private(set) var modifiers = ModifierState() {
        didSet { syncSystemModifiers() }
    }
    /// The modifiers that the keyboard holds down at the OS. A tapped modifier
    /// goes down at once, so a click or a key from another source gets it
    /// too, as with Sticky Keys of macOS.
    private var systemModifiers: Modifiers = []
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
    /// True while the bar hides the text of the field: private text, or a
    /// password field. The predictions, Speak, the text on screen, the
    /// clipboard history, and the tree viewer get no text of the field then.
    public var hidesFieldText: Bool { input == .secure }
    /// The store of the private text buttons. My Panel saves to the same store.
    public let privateTexts: any PrivateTextStore
    /// In Talk mode, the keys type into `talk` and the app in front gets no
    /// events.
    @Published public var mode: KeyboardMode = .type {
        didSet {
            accentChoices = []
            syncSystemModifiers()
        }
    }
    /// The accents of a held letter, shown over the word row until the user
    /// presses a key. Empty when no accents show.
    @Published public private(set) var accentChoices: [String] = []
    public let talk: TalkSession
    /// Called when the user submits the text in Type mode: a press on Return
    /// with no modifier.
    public var onSubmit: (() -> Void)?

    public let panels: PanelStore

    private let sink: any KeystrokeSink
    private let accents: AccentTable
    /// The last key pressed, with the modifiers it had, so a repeat types
    /// the same thing after the latched modifiers are used up.
    private var lastPress: (id: String, modifiers: ModifierState)?
    private var keyCodeMap: KeyCodeMap

    public init(
        sink: any KeystrokeSink,
        panels: PanelStore,
        accents: AccentTable,
        keyCodeMap: KeyCodeMap = SystemKeyboardLayout.currentMap(),
        privateTexts: any PrivateTextStore,
        talk: TalkSession
    ) {
        self.privateTexts = privateTexts
        self.talk = talk
        self.sink = sink
        self.panels = panels
        self.accents = accents
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
            return .forKey(virtual, modifiers: modifiers.flags)
        case .function:
            guard case .media(let media) = control(for: key.action, modifiers: modifiers) else { return .once }
            return media.repeatsWhenHeld ? .repeats : .once
        case .character(let character):
            guard modifiers.chord.isEmpty else { return .once }
            guard character.count == 1, character.first?.isLetter == true else { return .repeats }
            return .letter(choices: accents.choices(for: modifiers.apply(to: character)))
        }
    }

    /// What a panel button does while the user holds it. As for the press,
    /// only the modifiers of its own shortcut count. A scroll repeats.
    /// Everything else that is not a shortcut acts once.
    public static func holdBehavior(for action: PanelAction) -> HoldBehavior {
        switch action {
        case .scroll:
            .repeats
        case .shortcut(let shortcut):
            if case .virtual(let key) = shortcut.key { .forKey(key, modifiers: shortcut.modifiers) } else { .once }
        case .sequence, .text, .privateText:
            .once
        }
    }

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
        if let control = control(for: key.action, modifiers: modifiers) { return run(control) }
        if mode == .talk { return talk.press(key, modifiers: &modifiers) }
        switch key.action {
        case .modifier(let modifier):
            modifiers.tap(modifier)
        case .character(let character):
            type(character, secondary: key.secondaryLabel, modifiers: &modifiers)
        case .virtual(let virtual):
            if virtual == .return, modifiers.flags.isEmpty { onSubmit?() }
            post(virtual, modifiers: modifiers.flags)
            modifiers.consume()
        case .function(let number):
            guard let virtual = VirtualKey.function(number) else { return sink.beep() }
            post(virtual, modifiers: modifiers.flags)
            modifiers.consume()
        }
    }

    /// A press that controls the Mac, not the text. It acts in Type and
    /// Talk mode, and it keeps a latched modifier for the next key.
    private enum MacControl {
        case media(MediaKey)
        case scroll(ScrollDirection)
    }

    private func control(for action: KeyAction, modifiers: ModifierState) -> MacControl? {
        guard case .function(let number) = action, !modifiers.holdsChord else { return nil }
        return MediaKey.onFunctionKey(number).map(MacControl.media)
    }

    private func run(_ control: MacControl) {
        switch control {
        case .media(let media):
            sink.post(media: media)
        case .scroll(let direction):
            guard let scrollPoint else { return sink.beep() }
            sink.scroll(direction, at: scrollPoint)
        }
    }

    /// The place where the pointer last rested outside the keyboard. A
    /// scroll button scrolls it.
    private var scrollPoint: CGPoint?

    /// The pointer rested outside the keyboard, at `point` in screen
    /// coordinates from the top left.
    public func pointerRested(at point: CGPoint) {
        scrollPoint = point
    }

    // MARK: - Panel buttons

    /// A press on a button of a panel, of My Panel, or of the shortcut
    /// suggestions. The button sends only its own shortcut. A latched,
    /// locked, or held modifier does not add to it. The press uses up the
    /// latched modifiers.
    public func perform(_ action: PanelAction) {
        accentChoices = []
        switch action {
        case .scroll(let direction):
            return run(.scroll(direction))
        case _ where mode == .talk:
            return talk.perform(action, modifiers: &modifiers)
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
            guard let text = try? privateTexts.text(for: id) else { return sink.beep() }
            sink.type(text)
            hideField()
        }
        modifiers.consume()
    }

    /// A key from another source, such as the hardware keyboard, or a click
    /// outside the keyboard. It uses up the latched modifiers, as Sticky Keys
    /// of macOS does.
    public func otherInputPressed() {
        guard !modifiers.latched.isEmpty else { return }
        modifiers.consume()
    }

    /// macOS reports the modifier keys that the hardware holds. The keys
    /// show these modifiers, and the next key carries them.
    public func macModifiersChanged(_ mac: Modifiers) {
        guard mac != modifiers.mac else { return }
        modifiers.mac = mac
    }

    /// Releases each modifier that the keyboard holds at the OS. Call this
    /// before the app quits, or the modifiers stay down.
    public func releaseSystemModifiers() {
        sink.post(Keystroke.modifierChanges(from: systemModifiers, to: []))
        systemModifiers = []
    }

    /// The modifiers that are down at the OS: those that the keyboard holds and
    /// those that macOS holds. A key event posts no down or up for them.
    private var heldAtOS: Modifiers { systemModifiers.union(modifiers.mac) }

    /// Posts the downs and ups that make the OS hold the active modifiers.
    /// In Talk mode the app in front gets no events, so the OS holds none.
    /// A modifier that macOS holds gets no down and no up until macOS lets
    /// go of it.
    private func syncSystemModifiers() {
        let wanted = mode == .type ? modifiers.own.subtracting(.capsLock) : []
        let target = wanted.subtracting(modifiers.mac).union(systemModifiers.intersection(modifiers.mac))
        guard target != systemModifiers else { return }
        sink.post(Keystroke.modifierChanges(from: systemModifiers, to: target))
        systemModifiers = target
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
        let chord = modifiers.chord

        if chord.isEmpty {
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
                Keystroke.events(
                    virtualKey: resolved.virtualKey, modifiers: resolved.modifiers,
                    held: heldAtOS)
            )
        } else {
            sink.type(text)
        }
    }

    /// Posts a named key. Without a chord, the echo follows what the key
    /// does to the text.
    private func post(_ virtual: VirtualKey, modifiers: Modifiers) {
        sink.post(
            Keystroke.events(virtualKey: virtual.rawValue, modifiers: modifiers, held: heldAtOS))
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
                modifiers: modifiers.union(resolved.modifiers),
                held: heldAtOS
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
