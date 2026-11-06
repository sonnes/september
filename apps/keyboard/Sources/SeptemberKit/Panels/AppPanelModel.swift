import AppKit
import Combine

/// The app panel of the app in front: it picks the panel, adds the learned
/// chords, ranks the buttons by use, and learns new chords.
///
/// The app calls `appActivated(bundleID:windowTitle:)` when an app comes to
/// the front, `windowTitleChanged(_:)` when the title of its window changes,
/// `pressed(_:)` for each press on the panel, and `chordPressed(_:name:)` for
/// each chord from the hardware keyboard.
@MainActor
public final class AppPanelModel: ObservableObject {
    /// An app in the picker of the App Panels settings page.
    public struct App: Identifiable, Equatable, Sendable {
        public let bundleID: String
        public let name: String
        public var id: String { bundleID }
    }

    public let store: PanelStore
    public let usage: UsageStore
    public let learner: ShortcutLearner
    public let settings: AppPanelSettings

    /// The panel that the app in front gets, before the ranking.
    @Published public private(set) var current: AppPanelChoice
    /// The ranked panel to show: 12 slots or fewer.
    @Published public private(set) var panel: PanelDefinition

    private let appName: (String) -> String?
    private var frontBundleID: String?
    private var windowTitle: String?

    /// - Parameter appName: the name of an installed app from its bundle ID.
    public init(
        store: PanelStore,
        usage: UsageStore,
        learner: ShortcutLearner,
        settings: AppPanelSettings,
        appName: @escaping (String) -> String? = AppPanelModel.installedAppName
    ) {
        self.store = store
        self.usage = usage
        self.learner = learner
        self.settings = settings
        self.appName = appName
        current = AppPanelChoice(bundleID: nil, panel: store.generic)
        panel = usage.ranked(panel: store.generic, bundleID: nil)
    }

    // MARK: - The app in front

    /// Picks the panel of the app that came to the front, and takes a new
    /// ranking of its buttons.
    public func appActivated(bundleID: String?, windowTitle: String?) {
        frontBundleID = bundleID
        self.windowTitle = windowTitle
        resolve(rerank: true)
    }

    /// Picks the panel again when the window title of the app in front changes.
    /// A terminal that starts Claude Code gets the Claude Code panel. The
    /// order changes only when the panel changes, because Claude Code changes
    /// its title each second while it works.
    public func windowTitleChanged(_ title: String?) {
        guard title != windowTitle else { return }
        windowTitle = title
        resolve(rerank: false)
    }

    /// Counts a press on the panel. The order stays until the app comes to the
    /// front again.
    public func pressed(_ action: PanelAction) {
        guard let bundleID = current.bundleID,
            let button = panel.buttons.first(where: { $0.action == action })
        else { return }
        usage.record(buttonID: button.id, bundleID: bundleID)
    }

    /// Takes a chord that the user pressed on the hardware keyboard. A chord of
    /// the panel counts as a press of its button. Another chord can join the
    /// panel.
    ///
    /// - Parameter name: the name of the chord in the menu bar of the app.
    public func chordPressed(_ chord: Shortcut, name: (Shortcut) -> String?) {
        guard let bundleID = current.bundleID, settings.isLearningOn(bundleID) else { return }
        let full = fullPanel(bundleID: bundleID, base: current.panel)
        if let button = full.buttons.first(where: { $0.action == .shortcut(chord) }) {
            usage.record(buttonID: button.id, bundleID: bundleID)
            return
        }
        let known = store.keypadShortcuts.union(full.shortcuts)
        if learner.chordPressed(chord, bundleID: bundleID, known: known, name: name) != nil {
            resolve(rerank: false)
        }
    }

    // MARK: - Settings

    /// The bundled app panels by title, then the other apps that have usage or
    /// learned chords, by name.
    public var apps: [App] {
        let bundled = store.appPanels.map { App(bundleID: $0.bundleID, name: $0.panel.title) }
        let ids = Set(bundled.map(\.bundleID))
        let others = usage.bundleIDs.union(learner.bundleIDs)
            .subtracting(ids)
            .map { App(bundleID: $0, name: appName($0) ?? $0) }
            .sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
        return bundled + others
    }

    /// The panel of an app with its learned chords, in the order of its file.
    public func fullPanel(bundleID: String) -> PanelDefinition {
        fullPanel(bundleID: bundleID, base: store.appPanel(forBundleID: bundleID))
    }

    /// The pressed buttons of an app, most used first.
    public func mostUsed(bundleID: String) -> [UsageStore.Usage] {
        usage.mostUsed(panel: fullPanel(bundleID: bundleID), bundleID: bundleID)
    }

    /// Forgets the counts and the learned chords of one app.
    public func resetUsage(bundleID: String) {
        usage.reset(bundleID: bundleID)
        learner.forget(bundleID: bundleID)
        if bundleID == current.bundleID { resolve(rerank: true) }
    }

    public func setPanelOn(_ isOn: Bool, for bundleID: String) {
        settings.setPanelOn(isOn, for: bundleID)
        resolve(rerank: false)
    }

    public func setLearningOn(_ isOn: Bool, for bundleID: String) {
        settings.setLearningOn(isOn, for: bundleID)
    }

    /// The name of an installed app, from the file name of its bundle.
    public nonisolated static func installedAppName(_ bundleID: String) -> String? {
        guard let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleID)
        else { return nil }
        return FileManager.default.displayName(atPath: url.path)
            .replacingOccurrences(of: ".app", with: "")
    }

    // MARK: - Private

    private func fullPanel(bundleID: String, base: PanelDefinition) -> PanelDefinition {
        base.appending(learner.learned(bundleID: bundleID))
    }

    private func resolve(rerank: Bool) {
        let resolver = AppPanelResolver(store: store, hiddenPanels: settings.hiddenPanels)
        let choice = resolver.resolve(bundleID: frontBundleID, windowTitle: windowTitle)
        let changed = choice != current
        current = choice
        guard let bundleID = choice.bundleID else {
            panel = usage.ranked(panel: choice.panel, bundleID: nil)
            return
        }
        if rerank || changed { usage.appActivated(bundleID) }
        panel = usage.ranked(
            panel: fullPanel(bundleID: bundleID, base: choice.panel), bundleID: bundleID)
    }
}
