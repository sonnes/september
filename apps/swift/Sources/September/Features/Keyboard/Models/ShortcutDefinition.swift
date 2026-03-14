import CoreGraphics
import Foundation

struct ShortcutDefinition: Identifiable, Sendable {
    let id = UUID()
    let label: String
    let icon: String
    let tooltip: String
    let keyCode: UInt16
    let modifiers: CGEventFlags
    let keyboardHint: String?

    init(
        _ label: String,
        icon: String,
        tooltip: String,
        code: UInt16,
        modifiers: CGEventFlags = [],
        hint: String? = nil
    ) {
        self.label = label
        self.icon = icon
        self.tooltip = tooltip
        self.keyCode = code
        self.modifiers = modifiers
        self.keyboardHint = hint
    }
}

struct ShortcutSection: Identifiable, Sendable {
    let id = UUID()
    let title: String
    let shortcuts: [ShortcutDefinition]
}

/// Shortcut layout for the 4-section keyboard assembly.
enum ShortcutLayout {

    // MARK: Left Keypad — Edit Shortcuts (2-column, 200pt wide)

    static let leftKeypad = ShortcutSection(
        title: "Edit",
        shortcuts: [
            ShortcutDefinition("Cut", icon: "scissors", tooltip: "Cut (⌘X)", code: KeyCodes.x, modifiers: .maskCommand, hint: "⌘X"),
            ShortcutDefinition("Copy", icon: "doc.on.doc", tooltip: "Copy (⌘C)", code: KeyCodes.c, modifiers: .maskCommand, hint: "⌘C"),
            ShortcutDefinition("Paste", icon: "doc.on.clipboard", tooltip: "Paste (⌘V)", code: KeyCodes.v, modifiers: .maskCommand, hint: "⌘V"),
            ShortcutDefinition("Undo", icon: "arrow.uturn.backward", tooltip: "Undo (⌘Z)", code: KeyCodes.z, modifiers: .maskCommand, hint: "⌘Z"),
            ShortcutDefinition("Redo", icon: "arrow.uturn.forward", tooltip: "Redo (⇧⌘Z)", code: KeyCodes.z, modifiers: [.maskCommand, .maskShift], hint: "⇧⌘Z"),
            ShortcutDefinition("Select All", icon: "selection.pin.in.out", tooltip: "Select All (⌘A)", code: KeyCodes.a, modifiers: .maskCommand, hint: "⌘A"),
            ShortcutDefinition("Save", icon: "square.and.arrow.down", tooltip: "Save (⌘S)", code: KeyCodes.s, modifiers: .maskCommand, hint: "⌘S"),
            ShortcutDefinition("New", icon: "plus.square", tooltip: "New (⌘N)", code: KeyCodes.n, modifiers: .maskCommand, hint: "⌘N"),
            ShortcutDefinition("Open", icon: "folder", tooltip: "Open (⌘O)", code: KeyCodes.o, modifiers: .maskCommand, hint: "⌘O"),
            ShortcutDefinition("Print", icon: "printer", tooltip: "Print (⌘P)", code: KeyCodes.p, modifiers: .maskCommand, hint: "⌘P"),
            ShortcutDefinition("Close", icon: "xmark.square", tooltip: "Close (⌘W)", code: KeyCodes.w, modifiers: .maskCommand, hint: "⌘W"),
            ShortcutDefinition("Find", icon: "magnifyingglass", tooltip: "Find (⌘F)", code: KeyCodes.f, modifiers: .maskCommand, hint: "⌘F"),
        ]
    )

    // MARK: Right Keypad — Navigation (200pt wide)

    static let rightKeypad = ShortcutSection(
        title: "Navigation",
        shortcuts: [
            ShortcutDefinition("Search", icon: "magnifyingglass", tooltip: "Spotlight (⌘Space)", code: KeyCodes.space, modifiers: .maskCommand, hint: "⌘Space"),
            ShortcutDefinition("Scroll Up", icon: "arrow.up.doc", tooltip: "Page Up", code: KeyCodes.pageUp),
            ShortcutDefinition("Scroll Down", icon: "arrow.down.doc", tooltip: "Page Down", code: KeyCodes.pageDown),
            ShortcutDefinition("Zoom In", icon: "plus.magnifyingglass", tooltip: "Zoom In (⌘+)", code: KeyCodes.equal, modifiers: .maskCommand, hint: "⌘+"),
            ShortcutDefinition("Zoom Out", icon: "minus.magnifyingglass", tooltip: "Zoom Out (⌘-)", code: KeyCodes.minus, modifiers: .maskCommand, hint: "⌘−"),
            ShortcutDefinition("Home", icon: "arrow.up.to.line", tooltip: "Home (⌘↑)", code: KeyCodes.upArrow, modifiers: .maskCommand),
            ShortcutDefinition("End", icon: "arrow.down.to.line", tooltip: "End (⌘↓)", code: KeyCodes.downArrow, modifiers: .maskCommand),
        ]
    )
}
