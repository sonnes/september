import CoreGraphics
import Foundation

struct ShortcutDefinition: Identifiable {
    let id = UUID()
    let label: String
    let tooltip: String
    let keyCode: UInt16
    let modifiers: CGEventFlags

    init(_ label: String, tooltip: String, code: UInt16, modifiers: CGEventFlags = []) {
        self.label = label
        self.tooltip = tooltip
        self.keyCode = code
        self.modifiers = modifiers
    }
}

struct ShortcutSection: Identifiable {
    let id = UUID()
    let title: String
    let shortcuts: [ShortcutDefinition]
}

enum ShortcutLayout {
    static let general = ShortcutSection(
        title: "General",
        shortcuts: [
            ShortcutDefinition("⌘X", tooltip: "Cut (⌘X)", code: KeyCodes.x, modifiers: .maskCommand),
            ShortcutDefinition("⌘C", tooltip: "Copy (⌘C)", code: KeyCodes.c, modifiers: .maskCommand),
            ShortcutDefinition("⌘V", tooltip: "Paste (⌘V)", code: KeyCodes.v, modifiers: .maskCommand),
            ShortcutDefinition("⌘A", tooltip: "Select All (⌘A)", code: KeyCodes.a, modifiers: .maskCommand),
            ShortcutDefinition("⌘Z", tooltip: "Undo (⌘Z)", code: KeyCodes.z, modifiers: .maskCommand),
            ShortcutDefinition("⇧⌘Z", tooltip: "Redo (⇧⌘Z)", code: KeyCodes.z, modifiers: [.maskCommand, .maskShift]),
            ShortcutDefinition("⌘R", tooltip: "Refresh (⌘R)", code: KeyCodes.r, modifiers: .maskCommand),
            ShortcutDefinition("⌘S", tooltip: "Save (⌘S)", code: KeyCodes.s, modifiers: .maskCommand),
            ShortcutDefinition("⌘W", tooltip: "Close (⌘W)", code: KeyCodes.w, modifiers: .maskCommand),
        ]
    )

    static let terminal = ShortcutSection(
        title: "Terminal",
        shortcuts: [
            ShortcutDefinition("^C", tooltip: "Interrupt (⌃C)", code: KeyCodes.c, modifiers: .maskControl),
            ShortcutDefinition("^D", tooltip: "EOF (⌃D)", code: KeyCodes.d, modifiers: .maskControl),
        ]
    )

    static let movement = ShortcutSection(
        title: "Move",
        shortcuts: [
            ShortcutDefinition("PgUp", tooltip: "Page Up", code: KeyCodes.pageUp),
            ShortcutDefinition("PgDn", tooltip: "Page Down", code: KeyCodes.pageDown),
            ShortcutDefinition("Home", tooltip: "Home", code: KeyCodes.home),
            ShortcutDefinition("End", tooltip: "End", code: KeyCodes.end),
            ShortcutDefinition("⇧←", tooltip: "Select Left (⇧←)", code: KeyCodes.leftArrow, modifiers: .maskShift),
            ShortcutDefinition("⇧→", tooltip: "Select Right (⇧→)", code: KeyCodes.rightArrow, modifiers: .maskShift),
            ShortcutDefinition("⇧⌘←", tooltip: "Select to Line Start (⇧⌘←)", code: KeyCodes.leftArrow, modifiers: [.maskShift, .maskCommand]),
            ShortcutDefinition("⇧⌘→", tooltip: "Select to Line End (⇧⌘→)", code: KeyCodes.rightArrow, modifiers: [.maskShift, .maskCommand]),
        ]
    )

    static let leftSections: [ShortcutSection] = [general, terminal]
    static let rightSections: [ShortcutSection] = [movement]
}
