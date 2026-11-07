import Combine
import Foundation

extension Speaker: SpeechOutput {}

/// Joins the parts of the keyboard: the controller, the predictions, the
/// voice, the app panel, and My Panel.
///
/// The views and the app shell call the session. The session tells each part
/// what changed: the input bar feeds the predictions, the end of a speech
/// empties the Talk bar, and a press on a panel counts toward its order.
@MainActor
public final class KeyboardSession: ObservableObject {
    /// The tabs of the app panel.
    public enum AppPanelTab: Sendable, Hashable {
        /// The panel of the app in front.
        case app
        /// My Panel.
        case mine
    }

    public let controller: KeyboardController
    public let predictions: PredictionEngine
    public let speaker: Speaker
    public let appPanels: AppPanelModel
    public let userPanel: UserPanelStore?
    /// The counts of My Panel.
    public let userPanelUsage: UsageStore
    /// Why My Panel could not load its file. The file stays as it is.
    public let userPanelError: String?

    @Published public private(set) var speakMode: SpeakButton.Mode = .off
    /// The word that the voice speaks now, as a UTF-16 range in the text of the
    /// bar. `nil` when the bar does not hold the spoken text.
    @Published public private(set) var spokenWord: NSRange?
    @Published public var appPanelTab: AppPanelTab = .app
    /// The buttons of My Panel, most used first. The order changes only when
    /// an app comes to the front, so that a button never moves while the user
    /// aims at it.
    @Published public private(set) var mineButtons: [UserButton] = []
    /// Shows the input bar and the suggestions only when there is text input.
    public let inputBar: InputBarVisibility
    @Published private var isWriteInFront = false
    /// False while the document of the Write window has no text.
    private var writeHasText = false
    /// Gives the name of a chord in the menu bar of the app in front.
    public var menuName: (Shortcut) -> String? = { _ in nil }
    /// Reads what Speak reads in the Write window: the selection and the
    /// document. The keyboard cannot read its own web view through the
    /// accessibility API, so the app asks the editor page.
    public var writeSpeech: () async -> EditorSpeech? = { nil }

    /// What Speak read in Type mode.
    private var speaking: SpeakText?
    private var wasSpeaking = false
    private var subscriptions: Set<AnyCancellable> = []
    private var pending: Task<Void, Never>?
    /// The read of the Write window before Speak speaks it.
    private var readingWrite: Task<Void, Never>?
    private var isScheduled = false
    private var needsRank = false

    public init(
        controller: KeyboardController,
        predictions: PredictionEngine,
        speaker: Speaker,
        appPanels: AppPanelModel,
        userPanel: Result<UserPanelStore, any Error>,
        userPanelUsage: UsageStore,
        inputBar: InputBarVisibility = InputBarVisibility()
    ) {
        self.inputBar = inputBar
        self.controller = controller
        self.predictions = predictions
        self.speaker = speaker
        self.appPanels = appPanels
        self.userPanelUsage = userPanelUsage
        switch userPanel {
        case .success(let store):
            self.userPanel = store
            userPanelError = nil
        case .failure:
            self.userPanel = nil
            // The text of a decoding error can quote the file, and the file can
            // hold the text of the user.
            userPanelError =
                "My Panel could not read my-panel.json. The keyboard keeps the file as it is. Fix the file or move it away, then open the keyboard again."
        }

        controller.talk.speech = speaker
        controller.onChord = { [weak self] chord in self?.chordPressed(chord) }
        rankUserPanel()
        observe()
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

    /// A press on the app panel. It counts toward the order of the panel.
    public func pressAppPanel(_ action: PanelAction) {
        appPanels.pressed(action)
        controller.perform(action)
    }

    /// A press on My Panel. It counts toward the order of My Panel.
    public func pressMine(_ button: UserButton) {
        userPanelUsage.recordUserButton(button.id)
        controller.perform(button)
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
                speakWrite()
            case .type:
                guard let text = SpeakText(input: controller.input, isPrivate: controller.isFieldPrivate)
                else { return }
                speaking = text
                speaker.speak(text.text)
            }
        }
        update()
    }

    // MARK: - The app in front

    /// A different app came to the front. The last app's text goes first,
    /// then the app panel and My Panel take their new order.
    public func appChanged(name: String?, bundleID: String?, windowTitle: String?) {
        controller.appChanged(name: name, bundleID: bundleID)
        isWriteInFront = bundleID == WritePanel.id
        appPanels.appActivated(bundleID: bundleID, windowTitle: windowTitle)
        rankUserPanel()
    }

    public func windowTitleChanged(_ title: String?) {
        appPanels.windowTitleChanged(title)
    }

    /// The focus moved to a different element. Call it only for a new element,
    /// not for new text in the same one: private text stays hidden until the
    /// focus leaves its field.
    public func focusMoved() {
        controller.focusMoved()
    }

    /// The editor of the Write window reported the paragraph at the caret.
    /// The paragraph goes to the input bar. An empty document turns Speak
    /// off.
    public func writeCaretRead(_ caret: EditorCaret) {
        writeHasText = !caret.documentIsEmpty
        controller.focusChanged(to: caret.focusedField)
        scheduleUpdate()
    }

    /// A chord from the hardware keyboard or from the keys.
    public func chordPressed(_ chord: Shortcut) {
        guard !controller.isFieldPrivate else { return }
        appPanels.chordPressed(chord, name: menuName)
    }

    /// Waits until the parts have taken the last change.
    public func settle() async {
        // An update can start another one, such as the end of a speech that
        // empties the Talk bar.
        for _ in 0..<4 {
            await readingWrite?.value
            await pending?.value
            await Task.yield()
        }
        await predictions.settle()
    }

    // MARK: - Private

    /// Reads the Write window, then speaks. The bar shows only the paragraph
    /// at the caret, so no word of the bar lights up.
    private func speakWrite() {
        guard readingWrite == nil else { return }
        readingWrite = Task { [weak self] in
            guard let self else { return }
            let text = await self.writeSpeech()?.text
            self.readingWrite = nil
            guard let text, self.isWriteInFront, self.controller.mode == .type, !self.speaker.isSpeaking
            else { return }
            self.speaking = nil
            self.speaker.speak(text)
            self.update()
        }
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
            .combineLatest(controller.$input, controller.$mode, controller.$isFieldPrivate)
            .combineLatest($isWriteInFront)
            .sink { [weak self] values, isWriteInFront in
                let (field, input, mode, isPrivate) = values
                self?.inputBar.update(
                    InputBarVisibility.wantsBar(
                        mode: mode, focusedField: field, isFieldPrivate: isPrivate, input: input,
                        isWriteInFront: isWriteInFront))
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
        let isPrivate = mode == .type && controller.isFieldPrivate
        let input: InputMirror = mode == .talk ? .local(text: talk.text) : controller.input
        predictions.update(
            input: input, mode: mode == .talk ? .talk : .type,
            said: talk.said.lines.reversed().map(\.text), isPrivate: isPrivate)

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
                : SpeakText(input: controller.input, isPrivate: controller.isFieldPrivate) != nil
        }
        let speakMode = SpeakButton.Mode(isSpeaking: isSpeaking, canSpeak: canSpeak)
        if speakMode != self.speakMode { self.speakMode = speakMode }

        let word = spokenWord(mode: mode)
        if word != spokenWord { spokenWord = word }
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
