import Foundation

/// Builds the controller and the session of the keyboard from the parts that
/// the app gives, and loads the Phrases panel for the windows. The app and
/// `--snapshot` build the keyboard here, so both join the parts the same way.
@MainActor
public struct KeyboardAssembly {
    public let session: KeyboardSession
    /// The Phrases panel of Talk mode.
    public let phrases: PanelDefinition

    /// Throws when a bundled panel or the accent table does not load.
    ///
    /// - Parameters:
    ///   - defaults: the settings of My Panel and the clipboard history.
    ///   - privateTexts: the store of the private text buttons of My Panel.
    ///   - clipboardClock: the date of a new copy in the clipboard history.
    ///   - scheduler: the delays of the session and of the input bar.
    public init(
        sink: any KeystrokeSink,
        database: KeyboardDatabase,
        pasteboard: any ClipboardAccess,
        reader: any FrontAppReading,
        speaker: Speaker,
        write: any WriteReading,
        predictions: PredictionEngine,
        defaults: UserDefaults = .standard,
        privateTexts: any PrivateTextStore = KeychainPrivateTextStore(),
        clipboardClock: @escaping () -> Date = Date.init,
        scheduler: any DelayScheduler = MainQueueScheduler()
    ) throws {
        let controller = KeyboardController(
            sink: sink, panels: try PanelStore.bundled(), accents: try AccentTable.bundled("en"),
            talk: TalkSession(said: SaidList(database: database)))
        phrases = try Phrases.bundled()
        session = KeyboardSession(
            controller: controller, predictions: predictions, speaker: speaker,
            userPanel: Result { try UserPanelStore(database: database, defaults: defaults, privateTexts: privateTexts) },
            userPanelUsage: UsageStore(database: database),
            shortcutUsage: UsageStore(database: database, table: .shortcuts),
            reader: reader, write: write, inputBar: InputBarVisibility(scheduler: scheduler),
            clipboard: ClipboardHistory(database: database, defaults: defaults, now: clipboardClock),
            pasteboard: pasteboard, scheduler: scheduler)
    }
}
