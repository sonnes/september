import AppKit
import Combine
import Foundation

/// The one place a key press turns into keystrokes. Views call `press`; the
/// sink turns the result into real events (or records them, in tests).
@MainActor
public final class KeyboardController: ObservableObject {
    public enum Mode: String, CaseIterable, Sendable {
        case type, talk, write, settings

        public var symbol: String {
            switch self {
            case .type: "keyboard"
            case .talk: "speaker.wave.2"
            case .write: "square.and.pencil"
            case .settings: "gearshape"
            }
        }

        public var title: String { rawValue.capitalized }
    }

    @Published public var style: KeyboardStyle = .rainbow
    @Published public var mode: Mode = .type
    @Published public private(set) var modifiers = ModifierState()
    /// What we have typed since the last Return. Only shown when the app in
    /// front exposes no text of its own — see `input`.
    @Published public private(set) var echo = "" {
        didSet { refreshInput() }
    }
    /// What the input bar shows: the focused field mirrored back, our own echo,
    /// or nothing for a password field.
    @Published public private(set) var input: InputMirror = .local(text: "")
    /// The text field the app in front has focused, as far as accessibility
    /// can tell us.
    @Published public private(set) var focusedField: FocusedField?
    @Published public private(set) var frontmostAppName = "Finder"
    @Published public private(set) var appPanel: PanelDefinition
    /// Set by the app once it knows whether macOS trusts us to send keystrokes.
    @Published public var isAccessibilityTrusted = true
    /// Opens System Settings at the Accessibility pane.
    public var onOpenPermissionSettings: (() -> Void)?

    public let editPanel: PanelDefinition
    public let navigatePanel: PanelDefinition
    public let systemPanel: PanelDefinition

    private let sink: any KeystrokeSink
    private let store: PanelStore
    private var keyCodeMap: KeyCodeMap
    private var observers: [any NSObjectProtocol] = []

    public init(
        sink: any KeystrokeSink,
        store: PanelStore? = nil,
        keyCodeMap: KeyCodeMap? = nil
    ) {
        self.sink = sink
        let store = store ?? ((try? PanelStore.bundled()) ?? PanelStore.empty)
        self.store = store
        self.keyCodeMap = keyCodeMap ?? SystemKeyboardLayout.currentMap()
        editPanel = store.panel(id: "edit") ?? .empty(id: "edit", title: "EDIT")
        navigatePanel = store.panel(id: "navigate") ?? .empty(id: "navigate", title: "NAVIGATE")
        systemPanel = store.panel(id: "system") ?? .empty(id: "system", title: "SYSTEM")
        appPanel = store.appPanel(forBundleID: NSWorkspace.shared.frontmostApplication?.bundleIdentifier)
        frontmostAppName = NSWorkspace.shared.frontmostApplication?.localizedName ?? "Finder"
        observe()
    }

    // MARK: - Pressing keys

    public func press(_ key: KeyDefinition) {
        switch key.action {
        case .modifier(let modifier):
            modifiers.tap(modifier)
        case .character(let character):
            type(character, secondary: key.secondaryLabel)
        case .virtual(let virtual):
            post(virtual)
        case .shortcut(let shortcut):
            perform(.shortcut(shortcut))
        case .text(let text):
            sink.type(text)
            append(text)
        }
    }

    public func perform(_ action: PanelAction) {
        switch action {
        case .shortcut(let shortcut):
            post(shortcut)
        case .text(let text):
            sink.type(text)
            append(text)
        case .openPanel(let id):
            if let panel = store.panel(id: id) { appPanel = panel }
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
    public func appChanged(name: String, bundleID: String?) {
        frontmostAppName = name
        appPanel = store.appPanel(forBundleID: bundleID)
        focusedField = nil
        echo = ""
    }

    /// Called by the app whenever accessibility reports a different focused
    /// field, or new text in the one we are already watching.
    public func focusChanged(to field: FocusedField?) {
        focusedField = field
        if let field {
            frontmostAppName = field.appName
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
        guard !isMirroring else { return }
        echo += text
    }

    private func refreshInput() {
        input = focusedField?.display ?? .local(text: echo)
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
        if !isMirroring {
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

    // MARK: - Following the frontmost app

    private func observe() {
        // App switches arrive through `appChanged`, called by whoever is
        // watching focus: it has to clear the old app's text *before* the new
        // app's field is published, and two independent observers of the same
        // notification cannot promise that order.
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

extension PanelDefinition {
    static func empty(id: String, title: String) -> PanelDefinition {
        PanelDefinition(id: id, title: title, columns: 2, buttons: [])
    }
}

extension PanelStore {
    static var empty: PanelStore {
        PanelStore(
            panels: [],
            appPanels: [:],
            generic: .empty(id: "app.generic", title: "APP")
        )
    }
}
