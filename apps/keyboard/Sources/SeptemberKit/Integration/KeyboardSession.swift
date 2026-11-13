import Combine
import Foundation

extension Speaker: SpeechOutput {}

/// Joins the parts of the keyboard: the controller, the predictions, the
/// voice, the Write panel, and My Panel.
///
/// The views and the app shell call the session. The session tells each part
/// what changed: the input bar feeds the predictions, the end of a speech
/// empties the Talk bar, and a press on My Panel counts toward its order.
@MainActor
public final class KeyboardSession: ObservableObject {
    /// The tabs of the My Panel window while Write is in front. Another app
    /// shows only Mine.
    public enum PanelTab: Sendable, Hashable {
        /// The keys of the Write paper or the Write desk.
        case write
        case mine
    }

    public let controller: KeyboardController
    public let predictions: PredictionEngine
    public let speaker: Speaker
    public let userPanel: UserPanelStore?
    public let userPanelUsage: UsageStore
    /// Why My Panel could not load its buttons. The table stays as it is.
    public let userPanelError: String?

    @Published public private(set) var speakMode: SpeakButton.Mode = .off
    /// The word that the voice speaks now, as a UTF-16 range in the text of the
    /// bar. `nil` when the bar does not hold the spoken text.
    @Published public private(set) var spokenWord: NSRange?
    @Published public var panelTab: PanelTab = .write
    /// The keys of Write while it is in front: the paper keys or the desk
    /// keys. Nil for another app.
    @Published public private(set) var writePanel: PanelDefinition?
    /// The buttons of My Panel, most used first. The order changes only when
    /// an app comes to the front, so that a button never moves while the user
    /// aims at it.
    @Published public private(set) var mineButtons: [UserButton] = []
    /// Shows the input bar and the suggestions only when there is text input.
    public let inputBar: InputBarVisibility
    public let clipboard: ClipboardHistory
    public let pasteboard: any ClipboardAccess
    /// True while the clipboard history shows in the place of the predictions.
    @Published public private(set) var isHistoryOpen = false
    /// The page of the history that shows. Page 0 holds the newest texts.
    @Published public private(set) var historyPage = 0
    /// True when Cut and Copy have something to act on: a selection, an app
    /// that shows no field, or text in the Talk bar.
    @Published public private(set) var canCutOrCopy = true
    @Published public private(set) var canPaste = false
    /// The shortcuts of the app in front that show in the place of the input
    /// bar: in Type mode with no text field in focus, and while Command or
    /// Control is on. Empty when the bar shows.
    @Published public private(set) var shortcuts: [AppShortcut] = []
    /// A modifier that macOS holds shows the shortcuts after this hold, so a
    /// quick chord does not make the bar blink.
    public static let modifierHoldDelay: TimeInterval = 0.4
    /// The time before a read of the text on screen. Other apps move the
    /// focus late after a switch.
    public static let screenReadDelay: TimeInterval = 0.15
    @Published private var front: FrontTarget?
    private var isWriteInFront: Bool { front?.isWrite == true }
    /// The text near the field of the app in front, from the last read.
    private var screen: ScreenContext?
    private var writeHasText = false
    /// The caret and the text for Speak of the Write window. The keyboard
    /// cannot read its own window through the accessibility API.
    private let write: any WriteReading

    private let reader: any FrontAppReading
    /// The menu shortcuts of the app in front, from the last read. The
    /// session reads the menu only when a suggestion needs it, and keeps the
    /// read until another app comes to the front.
    private var menu: [AppShortcut]?
    private var pendingScreenRead: (any ScheduledWork)?
    private var screenRead: Task<Void, Never>?
    private var fieldWasEmpty = true
    /// True when the input bar has something to show, from the last change
    /// of the field, the input, the mode, or the app in front.
    private var wantsBar = false
    private var clipboardWatcher: ClipboardWatcher?
    /// The modifiers that macOS holds, after the hold delay.
    private var heldModifiers: Modifiers = []
    private var pendingHold: (any ScheduledWork)?
    private let scheduler: any DelayScheduler

    /// What Speak read in Type mode.
    private var speaking: SpeakText?
    private var wasSpeaking = false
    private var subscriptions: Set<AnyCancellable> = []
    private var pending: Task<Void, Never>?
    private var isScheduled = false
    private var needsRank = false

    public init(
        controller: KeyboardController,
        predictions: PredictionEngine,
        speaker: Speaker,
        userPanel: Result<UserPanelStore, any Error>,
        userPanelUsage: UsageStore,
        reader: any FrontAppReading,
        write: any WriteReading,
        inputBar: InputBarVisibility = InputBarVisibility(),
        clipboard: ClipboardHistory,
        pasteboard: any ClipboardAccess = MemoryPasteboard(),
        scheduler: any DelayScheduler = MainQueueScheduler()
    ) {
        self.scheduler = scheduler
        self.reader = reader
        self.write = write
        self.inputBar = inputBar
        self.clipboard = clipboard
        self.pasteboard = pasteboard
        self.controller = controller
        self.predictions = predictions
        self.speaker = speaker
        self.userPanelUsage = userPanelUsage
        switch userPanel {
        case .success(let store):
            self.userPanel = store
            userPanelError = nil
        case .failure(let error):
            self.userPanel = nil
            userPanelError = Self.userPanelMessage(for: error)
        }

        controller.talk.speech = speaker
        // The Write window keeps its text in its documents, so its sentences
        // do not go into the history.
        controller.onSubmit = { [weak self] in
            guard let self else { return }
            self.predictions.submit(keepsSentences: !self.isWriteInFront)
        }
        controller.talk.onSpeak = { [weak self] in self?.predictions.submit() }
        clipboardWatcher = ClipboardWatcher(
            pasteboard: pasteboard, history: clipboard,
            shouldSkip: { [weak self] in self?.controller.hidesFieldText ?? true },
            onChange: { [weak self] in self?.pasteboardChanged() })
        rankUserPanel()
        observe()
        pasteboardChanged()
        update()
    }

    // MARK: - Typing

    /// Types the text of a prediction or a completion: into the app in Type
    /// mode, and into the bar in Talk mode.
    public func type(_ text: String) {
        switch controller.mode {
        case .type: controller.perform(.text(text))
        case .talk: controller.talk.type(text)
        }
    }

    /// A press on a word completion. The engine keeps the word, so that macOS
    /// learns from it when the user submits the text.
    public func pickWord(_ completion: WordCompletion) {
        predictions.wordPicked(completion)
        type(completion.textToType)
    }

    /// A press on a shortcut suggestion. It presses the chord in the app and
    /// ends a latched modifier.
    public func pressShortcut(_ shortcut: AppShortcut) {
        controller.perform(.shortcut(shortcut.shortcut))
    }

    /// The modifiers that macOS holds changed. Command or Control shows the
    /// shortcuts after `modifierHoldDelay`. A change while the shortcuts show,
    /// and a release, act at once.
    private func macModifiersChanged(_ modifiers: Modifiers) {
        pendingHold?.cancel()
        pendingHold = nil
        let held = modifiers.intersection(AppShortcut.filterModifiers)
        guard !held.isDisjoint(with: [.command, .control]) else {
            heldModifiers = []
            scheduleUpdate()
            return
        }
        guard heldModifiers.isEmpty else {
            heldModifiers = held
            scheduleUpdate()
            return
        }
        pendingHold = scheduler.schedule(after: Self.modifierHoldDelay) { [weak self] in
            self?.pendingHold = nil
            self?.heldModifiers = held
            self?.scheduleUpdate()
        }
    }

    /// A press on My Panel. It counts toward the order of My Panel.
    public func pressMine(_ button: UserButton) {
        userPanelUsage.record(button.id)
        controller.perform(button.action)
    }

    // MARK: - The clipboard

    /// Shows the clipboard history in the place of the predictions, or the
    /// predictions again. The history opens on its newest page.
    public func toggleHistory() {
        historyPage = 0
        isHistoryOpen.toggle()
    }

    public func olderPage() {
        historyPage = min(historyPage + 1, clipboard.pageCount - 1)
    }

    public func newerPage() {
        historyPage = max(historyPage - 1, 0)
    }

    /// A press on a copied text. In Type mode the text goes on the clipboard
    /// and Command-V pastes it into the app in front. In Talk mode the text
    /// goes into the Talk bar. The history then closes.
    public func pasteClip(_ item: ClipboardItem) {
        isHistoryOpen = false
        switch controller.mode {
        case .type:
            pasteboard.write(item.text)
            clipboard.add(item.text)
            pasteboardChanged()
            controller.perform(.shortcut(ClipboardShortcut.paste))
        case .talk:
            controller.talk.type(item.text)
        }
    }

    /// Cut presses Command-X in Type mode. In Talk mode it copies the Talk
    /// text and clears the bar.
    public func cut() {
        switch controller.mode {
        case .type:
            controller.perform(.shortcut(ClipboardShortcut.cut))
        case .talk:
            copyTalkText()
            controller.talk.clear()
        }
    }

    /// Copy presses Command-C in Type mode. In Talk mode it copies the Talk
    /// text.
    public func copy() {
        switch controller.mode {
        case .type: controller.perform(.shortcut(ClipboardShortcut.copy))
        case .talk: copyTalkText()
        }
    }

    /// Paste presses Command-V in Type mode. In Talk mode it types the text
    /// of the clipboard into the Talk bar.
    public func paste() {
        switch controller.mode {
        case .type:
            controller.perform(.shortcut(ClipboardShortcut.paste))
        case .talk:
            guard let text = pasteboard.string() else { return }
            controller.talk.type(text)
        }
    }

    /// Reads the clipboard for a new copy. The history keeps no copy while
    /// the bar hides the text of the field. macOS has no notification for a
    /// change of the clipboard, so the app calls this on a timer.
    public func pollClipboard() {
        clipboardWatcher?.poll()
    }

    /// The clipboard changed. Paste turns on or off.
    public func pasteboardChanged() {
        let hasText = pasteboard.string()?.isEmpty == false
        if hasText != canPaste { canPaste = hasText }
        if historyPage >= clipboard.pageCount { historyPage = clipboard.pageCount - 1 }
    }

    private func copyTalkText() {
        let text = controller.talk.text
        guard !text.isEmpty else { return }
        pasteboard.write(text)
        pasteboardChanged()
    }

    // MARK: - Speak

    /// Speak, or Stop during speech. In Type mode Speak reads the selection
    /// of the field, or the whole field. In the Write window it reads the
    /// selection, or the whole document without its Markdown marks. In Talk
    /// mode it speaks the bar.
    public func speakPressed() {
        if speaker.isSpeaking {
            if controller.mode == .talk { controller.talk.stop() } else { speaker.stop() }
        } else {
            switch controller.mode {
            case .talk:
                controller.talk.speak()
            case .type where isWriteInFront:
                guard let text = write.speech.text else { return }
                // The bar shows only the paragraph at the caret, so no word
                // of the bar lights up.
                speaking = nil
                speaker.speak(text)
            case .type:
                guard let text = SpeakText(input: controller.input, isPrivate: controller.hidesFieldText)
                else { return }
                speaking = text
                speaker.speak(text.text)
            }
        }
        update()
    }

    // MARK: - The app in front

    /// A different app or Write came to the front. The last app's text goes
    /// first, then My Panel takes its new order. For Write, the bar then
    /// shows the paragraph at the caret.
    public func frontChanged(_ target: FrontTarget) {
        controller.appChanged(name: target.name)
        isHistoryOpen = false
        front = target
        screen = nil
        menu = nil
        if case .write(let panel) = target {
            writePanel = controller.panels.writePanel(for: panel)
        } else {
            writePanel = nil
        }
        predictions.focusMoved()
        rankUserPanel()
        if target.isWrite { writeCaretMoved(write.caret) }
        scheduleUpdate()
        readScreenSoon()
    }

    /// The paper of Write turned into the desk, or the desk into the paper.
    /// Only the keys of Write and the caret change.
    public func writePanelChanged(_ panel: WritePanel) {
        guard isWriteInFront else { return }
        front = .write(panel)
        writePanel = controller.panels.writePanel(for: panel)
        writeCaretMoved(write.caret)
    }


    /// The focus moved to a different element. Call it only for a new element,
    /// not for new text in the same one: private text stays hidden until the
    /// focus leaves its field.
    public func focusMoved() {
        controller.focusMoved()
        predictions.focusMoved()
        readScreenSoon()
    }

    /// The app in front reported its focused field, or new text in it. A
    /// field that empties was sent, and the text above it changed, so the
    /// session reads the screen again.
    public func focusChanged(to field: FocusedField?) {
        controller.focusChanged(to: field)
        let isEmpty = field?.text?.isEmpty ?? true
        if isEmpty, !fieldWasEmpty { readScreenSoon() }
        fieldWasEmpty = isEmpty
    }

    /// The editor of the Write window reported the paragraph at the caret.
    /// The paragraph goes to the input bar. An empty document turns Speak
    /// off. Nothing changes while another app is in front.
    public func writeCaretMoved(_ caret: EditorCaret) {
        guard isWriteInFront else { return }
        writeHasText = !caret.documentIsEmpty
        controller.focusChanged(to: caret.focusedField)
        scheduleUpdate()
    }

    /// Waits until the parts have taken the last change.
    public func settle() async {
        // An update can start another one, such as the end of a speech that
        // empties the Talk bar.
        repeat {
            await screenRead?.value
            await pending?.value
            await Task.yield()
        } while isScheduled
        await predictions.settle()
    }

    // MARK: - Private

    /// One fixed message for each kind of error. The text of a decoding error
    /// can quote a stored row, and a row can hold the text of the user.
    private static func userPanelMessage(for error: any Error) -> String {
        switch error {
        case is DecodingError:
            "My Panel could not read one of its saved buttons. The keyboard keeps the saved buttons as they are."
        default:
            "My Panel could not read its buttons from the keyboard database. The keyboard keeps the saved buttons as they are."
        }
    }

    private var mayReadScreen: Bool {
        predictions.screenEnabled && controller.mode == .type && !controller.hidesFieldText
    }

    /// Reads the text on screen of the app in front after
    /// `screenReadDelay`. A newer read cancels this one. The rules apply when
    /// the read starts.
    private func readScreenSoon() {
        cancelScreenRead()
        guard case .app(let app) = front else { return }
        pendingScreenRead = scheduler.schedule(after: Self.screenReadDelay) { [weak self] in
            guard let self else { return }
            self.pendingScreenRead = nil
            guard self.mayReadScreen, self.front == .app(app) else { return }
            self.screenRead = Task { [weak self, reader] in
                let screen = await reader.screenContext(pid: app.pid)
                guard let self, !Task.isCancelled, self.front == .app(app) else { return }
                self.screenRead = nil
                self.screen = screen
                self.scheduleUpdate()
            }
        }
    }

    private func cancelScreenRead() {
        pendingScreenRead?.cancel()
        pendingScreenRead = nil
        screenRead?.cancel()
        screenRead = nil
    }

    private func rankUserPanel() {
        mineButtons = userPanel?.ranked(by: userPanelUsage) ?? []
    }

    private func observe() {
        let changes: [AnyPublisher<Void, Never>] = [
            controller.objectWillChange.eraseToAnyPublisher(),
            controller.talk.objectWillChange.eraseToAnyPublisher(),
            controller.talk.said.objectWillChange.eraseToAnyPublisher(),
            speaker.objectWillChange.eraseToAnyPublisher(),
        ]
        // `objectWillChange` fires before the new value is stored, so the
        // update waits a turn.
        Publishers.MergeMany(changes)
            .sink { [weak self] in self?.scheduleUpdate() }
            .store(in: &subscriptions)
        // The values come from the publishers: `@Published` publishes before
        // it stores the new value.
        controller.$focusedField
            .combineLatest(controller.$input, controller.$mode, $front)
            .sink { [weak self] field, input, mode, front in
                let wantsBar = InputBarVisibility.wantsBar(
                    mode: mode, focusedField: field, hidesFieldText: input == .secure, input: input,
                    isWriteInFront: front?.isWrite == true)
                self?.wantsBar = wantsBar
                self?.inputBar.update(wantsBar)
            }
            .store(in: &subscriptions)
        controller.$mode
            .dropFirst()
            .removeDuplicates()
            .sink { [weak self] _ in self?.isHistoryOpen = false }
            .store(in: &subscriptions)
        controller.$modifiers
            .map(\.mac)
            .removeDuplicates()
            .dropFirst()
            .sink { [weak self] in self?.macModifiersChanged($0) }
            .store(in: &subscriptions)
        predictions.$screenEnabled
            .dropFirst()
            .sink { [weak self] isOn in
                if isOn { self?.readScreenSoon() } else { self?.cancelScreenRead() }
                self?.scheduleUpdate()
            }
            .store(in: &subscriptions)
        // A button added in Settings shows at once. The user is in the Settings
        // window, not aiming at the panel.
        userPanel?.$buttons
            .dropFirst()
            .sink { [weak self] _ in self?.scheduleUpdate(rank: true) }
            .store(in: &subscriptions)
    }

    private func scheduleUpdate(rank: Bool = false) {
        needsRank = needsRank || rank
        guard !isScheduled else { return }
        isScheduled = true
        pending = Task { [weak self] in
            guard let self else { return }
            self.isScheduled = false
            if self.needsRank {
                self.needsRank = false
                self.rankUserPanel()
            }
            self.update()
        }
    }

    private func update() {
        let mode = controller.mode
        let talk = controller.talk
        // The input of a field whose text the bar hides is `.secure`, so the
        // predictions get no text. `isPrivate` tells private text from a
        // password field for the notice.
        let isPrivate = mode == .type && controller.isFieldPrivate
        let input: InputMirror = mode == .talk ? .local(text: talk.text) : controller.input
        let usesScreen = mode == .type && !isWriteInFront && predictions.screenEnabled
        predictions.update(
            input: input, mode: mode == .talk ? .talk : .type,
            said: mode == .talk ? talk.said.recentTexts : [], isPrivate: isPrivate,
            screen: usesScreen ? screen : nil)

        let isSpeaking = speaker.isSpeaking
        if wasSpeaking, !isSpeaking {
            talk.speechEnded()
            speaking = nil
        }
        wasSpeaking = isSpeaking

        let canSpeak: Bool
        switch mode {
        case .talk:
            canSpeak = !talk.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        case .type:
            // The Write window reads the whole document, so the paragraph at
            // the caret can be empty.
            canSpeak =
                isWriteInFront
                ? writeHasText
                : SpeakText(input: controller.input, isPrivate: controller.hidesFieldText) != nil
        }
        let speakMode = SpeakButton.Mode(isSpeaking: isSpeaking, canSpeak: canSpeak)
        if speakMode != self.speakMode { self.speakMode = speakMode }

        let canCutOrCopy: Bool
        switch mode {
        case .talk:
            canCutOrCopy = !talk.text.isEmpty
        case .type:
            switch controller.input {
            case .secure: canCutOrCopy = false
            case .mirrored(_, _, let selectionLength): canCutOrCopy = selectionLength > 0
            // The app shows no field, so the keyboard cannot see a selection.
            case .local: canCutOrCopy = true
            }
        }
        if canCutOrCopy != self.canCutOrCopy { self.canCutOrCopy = canCutOrCopy }

        let word = spokenWord(mode: mode)
        if word != spokenWord { spokenWord = word }

        let shortcuts = shortcutSuggestions(mode: mode)
        if shortcuts != self.shortcuts { self.shortcuts = shortcuts }
    }

    /// The shortcuts for the place of the bar, or none when the bar shows.
    private func shortcutSuggestions(mode: KeyboardMode) -> [AppShortcut] {
        // Talk mode sends no keys to the app. The Write window has its panel.
        guard mode == .type, !isWriteInFront else { return [] }
        let on = controller.modifiers.own.union(heldModifiers)
        let byModifier = !on.isDisjoint(with: [.command, .control])
        guard byModifier || !wantsBar else { return [] }
        if menu == nil, case .app(let app) = front { menu = reader.menuShortcuts(pid: app.pid) }
        return AppShortcut.suggestions(menu: menu ?? [], modifiers: byModifier ? on : [])
    }

    private func spokenWord(mode: KeyboardMode) -> NSRange? {
        guard case .speaking(let text, let word) = speaker.state else { return nil }
        switch mode {
        case .talk:
            return text == controller.talk.text ? word : nil
        case .type:
            guard let speaking, speaking.text == text else { return nil }
            return speaking.word(word, in: controller.input.text)
        }
    }
}
