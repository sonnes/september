import Foundation

/// The panel for the app in front, and the key that its usage and its learned
/// chords are kept under.
public struct AppPanelChoice: Sendable, Equatable {
    /// The bundle ID of the app, or `AppPanelResolver.claudeCodeID` for Claude
    /// Code in a terminal. Nil for an app with no bundle ID.
    public let bundleID: String?
    public let panel: PanelDefinition

    public init(bundleID: String?, panel: PanelDefinition) {
        self.bundleID = bundleID
        self.panel = panel
    }
}

/// Picks the app panel from the bundle ID and the window title of the app in
/// front.
public struct AppPanelResolver: Sendable {
    /// The ID of the Claude Code panel, which stands in for a bundle ID.
    public static let claudeCodeID = "claude-code"

    /// The terminals whose window title can name Claude Code.
    public static let terminalBundleIDs: Set<String> = [
        "com.apple.Terminal", "com.googlecode.iterm2", "com.mitchellh.ghostty",
    ]

    private let store: PanelStore
    private let hiddenPanels: Set<String>

    /// - Parameter hiddenPanels: the panels that the user turned off. The app
    ///   gets the generic panel instead.
    public init(store: PanelStore, hiddenPanels: Set<String> = []) {
        self.store = store
        self.hiddenPanels = hiddenPanels
    }

    public func resolve(bundleID: String?, windowTitle: String?) -> AppPanelChoice {
        guard let bundleID else { return AppPanelChoice(bundleID: nil, panel: store.generic) }
        if AppPanelResolver.terminalBundleIDs.contains(bundleID),
            let windowTitle, AppPanelResolver.namesClaudeCode(windowTitle),
            !hiddenPanels.contains(AppPanelResolver.claudeCodeID)
        {
            return AppPanelChoice(
                bundleID: AppPanelResolver.claudeCodeID,
                panel: store.appPanel(forBundleID: AppPanelResolver.claudeCodeID))
        }
        let panel = hiddenPanels.contains(bundleID) ? store.generic : store.appPanel(forBundleID: bundleID)
        return AppPanelChoice(bundleID: bundleID, panel: panel)
    }

    /// True when a terminal window title shows that Claude Code runs in it.
    ///
    /// Claude Code 2.1 sets the title to a status glyph and a session title:
    /// "✳ Claude Code" when idle, "◐ <title>" or "◑ <title>" while it works.
    /// It also names its process "claude", which Terminal can show as a part
    /// of the title, such as "~/work — claude — 80×24".
    public static func namesClaudeCode(_ title: String) -> Bool {
        if title.contains("Claude Code") { return true }
        let glyphs: [Character] = ["✳", "◐", "◑"]
        let parts = title.components(separatedBy: " — ")
        return parts.contains { part in
            let part = part.trimmingCharacters(in: .whitespaces)
            if part == "claude" || part.hasSuffix("(claude)") { return true }
            guard let first = part.first, glyphs.contains(first) else { return false }
            return part.dropFirst().first == " "
        }
    }
}
