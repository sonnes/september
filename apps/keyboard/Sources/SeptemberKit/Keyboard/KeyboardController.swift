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
    @Published public private(set) var appPanel: PanelDefinition
    /// True after a private text button typed into the focused field, until
    /// the focus moves. The bar hides the field, and the controller keeps none
    /// of its text, so predictions and learning never see it.
    @Published public private(set) var isFieldPrivate = false
    /// Where private text buttons keep their text.
    public var privateTexts: any PrivateTextStore = KeychainPrivateTextStore()
    /// In Talk mode, the keys type into `talk` and the app in front gets no
    /// events.
    @Published public var mode: KeyboardMode = .type
    public let talk = TalkSession()

    public let panels: PanelStore

    private let sink: any KeystrokeSink
    private var keyCodeMap: KeyCodeMap
    private var observers: [any NSObjectProtocol] = []

    public init(
        sink: any KeystrokeSink,
        panels: PanelStore,
        keyCodeMap: KeyCodeMap = SystemKeyboardLayout.currentMap()
    ) {
        self.sink = sink
        self.panels = panels
        self.keyCodeMap = keyCodeMap
        appPanel = panels.appPanel(forBundleID: nil)
        observe()
    }

    // MARK: - Pressing keys

    public func press(_ key: KeyDefinition) {
        if mode == .talk { return talk.press(key, modifiers: &modifiers) }
        switch key.action {
        case .modifier(let modifier):
            modifiers.tap(modifier)
        case .character(let character):
            type(character, secondary: key.secondaryLabel)
        case .virtual(let virtual):
            post(virtual)
        }
    }

    public func perform(_ action: PanelAction) {
        if mode == .talk { return talk.perform(action, modifiers: &modifiers) }
        switch action {
        case .shortcut(let shortcut):
            post(shortcut)
        case .sequence(let steps):
            steps.forEach(post)
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
    public func appChanged(name: String?, bundleID: String?) {
        frontmostAppName = name
        appPanel = panels.appPanel(forBundleID: bundleID)
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
            if let resolved = keyCodeMap.keystroke(for: base) {
                sink.post(
                    Keystroke.events(
                        virtualKey: resolved.virtualKey,
                        modifiers: flags.union(resolved.modifiers)
                    )
                )
            }
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

    private func post(_ virtual: VirtualKey) {
        sink.post(
            Keystroke.events(
                virtualKey: virtual.rawValue,
                modifiers: modifiers.active.subtracting(.capsLock)
            )
        )
        if !isMirroring, !isFieldPrivate {
            switch virtual {
            case .delete: echo = String(echo.dropLast())
            case .return: echo = ""
            case .space: echo += " "
            default: break
            }
        }
        modifiers.consume()
    }

    private func post(_ shortcut: Shortcut) {
        switch shortcut.key {
        case .virtual(let virtual):
            sink.post(
                Keystroke.events(virtualKey: virtual.rawValue, modifiers: shortcut.modifiers)
            )
        case .character(let character):
            guard let resolved = keyCodeMap.keystroke(for: character) else { return }
            sink.post(
                Keystroke.events(
                    virtualKey: resolved.virtualKey,
                    modifiers: shortcut.modifiers.union(resolved.modifiers)
                )
            )
        }
    }

    // MARK: - Following the input source

    private func observe() {
        observers.append(
            DistributedNotificationCenter.default().addObserver(
                forName: SystemKeyboardLayout.inputSourceChanged,
                object: nil,
                queue: .main
            ) { [weak self] _ in
                Task { @MainActor in self?.keyCodeMap = SystemKeyboardLayout.currentMap() }
            }
        )
    }
}
