import AppKit
import Combine
import SeptemberKit
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var keyboardPanel: FloatingPanel?
    private var panels: [DetachedPanel: FloatingPanel] = [:]
    private var treePanel: FloatingPanel?
    private var statusItem: NSStatusItem?
    private var keyboardItem: NSMenuItem?
    private var styleMenu: NSMenu?
    private var subscriptions: Set<AnyCancellable> = []
    private var observers: [any NSObjectProtocol] = []
    private let permission = AccessibilityPermission()
    private let sink = CGEventSink()
    private let focusWatcher = FocusWatcher()
    private let treeModel = AXTreeModel()
    private let keyboardSettings = KeyboardSettings()
    private let inputMonitoring = InputMonitoringStatus()
    private let keyboardPosition = KeyboardPosition()
    private var controller: KeyboardController!
    private var session: KeyboardSession!
    private var speech: SpeechServices!
    private var content: WindowContent!
    private var settingsWindow: SettingsWindowController!
    private var write: WriteController!
    /// Held strongly: the tap's callback does not retain it.
    private var chordTap: ChordTap?
    private var tracker = FrontAppTracker(ownPID: ProcessInfo.processInfo.processIdentifier)
    private var isWriteInFront = false
    /// How to read the text near the field in each app.
    private var contextRules = ContextRules(rules: [:])
    /// The read of the text near the field that runs now.
    private var screenRead: Task<Void, Never>?
    private var fieldWasEmpty = true
    private var clipboardWatcher: ClipboardWatcher?
    private var clipboardTimer: Timer?
    private var appIcon: NSImage?
    private var mode: KeyboardMode = .type

    /// The tree viewer is on by default — it is the window that shows why an
    /// app does or does not mirror.
    private var isTreeVisible = true
    private var treeRefreshScheduled = false
    private var treeTimer: Timer?

    /// Room kept at the right edge for the viewer, so the keyboard centres in
    /// what is left instead of sliding under it.
    private var reservedWidth: CGFloat {
        isTreeVisible ? Metrics.treeViewerWidth + Metrics.sectionSpacing : 0
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let phrases: PanelDefinition
        do {
            controller = KeyboardController(
                sink: sink, panels: try PanelStore.bundled(),
                talk: TalkSession(said: SaidList(fileURL: SaidList.defaultURL)))
            phrases = try Phrases.bundled()
            contextRules = try ContextRules.bundled()
        } catch {
            fail(loadingPanels: error)
            return
        }

        speech = SpeechServices()
        speech.start()
        let predictions = PredictionEngine()
        let appPanels = AppPanelModel(
            store: controller.panels, usage: UsageStore(), learner: ShortcutLearner(),
            settings: AppPanelSettings())
        session = KeyboardSession(
            controller: controller, predictions: predictions, speaker: speech.speaker,
            appPanels: appPanels, userPanel: Result { try UserPanelStore() },
            userPanelUsage: UsageStore(fileURL: UsageStore.userPanelURL),
            clipboard: ClipboardHistory(fileURL: ClipboardHistory.defaultURL),
            pasteboard: SystemPasteboard())
        watchClipboard()

        write = WriteController()
        write.onKeyChanged = { [weak self] isKey in self?.writeKeyChanged(isKey) }
        write.bringToFront = { AppActivation.bringToFront($0) }
        write.windowClosed = { AppActivation.windowClosed($0) }
        write.onPanelChange = { [weak self] _ in self?.writePanelChanged() }
        write.onCaretChange = { [weak self] caret in self?.writeCaretChanged(caret) }
        session.writeSpeech = { [weak self] in self?.write.speech }
        settingsWindow = SettingsWindowController(pages: makeSettingsPages())
        content = WindowContent(
            controller: controller, session: session, permission: permission, phrases: phrases,
            presser: KeyPresser(timing: { KeyTiming.current() }),
            write: { [weak self] in self?.showWrite() },
            arrange: { [weak self] in self?.arrangePanels() },
            settings: { [weak self] in self?.showSettings() })

        followSettings()

        // The banner and the menu ask for permission, so starting Keyboard
        // never puts a system dialog in front of what the user was doing.
        permission.startMonitoring()
        permission.$isTrusted.dropFirst()
            .sink { [weak self] _ in
                // The banner changes the keyboard's size. `sink` runs before
                // the new value is stored, so the rebuild waits a turn.
                Task { @MainActor in self?.refreshKeyboard() }
            }
            .store(in: &subscriptions)
        controller.$mode.dropFirst().removeDuplicates()
            .sink { [weak self] mode in
                Task { @MainActor in self?.modeChanged(to: mode) }
            }
            .store(in: &subscriptions)
        // Private text in the field: the viewer drops the value of the field.
        controller.$isFieldPrivate.dropFirst()
            .sink { [weak self] _ in Task { @MainActor in self?.refreshTree() } }
            .store(in: &subscriptions)

        watchFocus()
        startChordTap()
        predictions.refreshAvailability()
        observers.append(
            NSWorkspace.shared.notificationCenter.addObserver(
                forName: NSWorkspace.didWakeNotification, object: nil, queue: .main
            ) { [weak self] _ in
                MainActor.assumeIsolated { self?.session.predictions.refreshAvailability() }
            })
        observers.append(
            DistributedNotificationCenter.default().addObserver(
                forName: SystemKeyboardLayout.inputSourceChanged, object: nil, queue: .main
            ) { [weak self] _ in
                MainActor.assumeIsolated {
                    self?.controller.layoutChanged(to: SystemKeyboardLayout.currentMap())
                }
            })

        treeModel.onRefresh = { [weak self] in self?.refreshTree() }
        // Values in the tree age between focus changes — keep them fresh
        // enough to trust without rebuilding it on every keystroke.
        treeTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.refreshTree() }
        }

        showWindows()
        installStatusItem()
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        AppActivation.appBecameActive()
        session?.predictions.refreshAvailability()
    }

    func applicationWillTerminate(_ notification: Notification) {
        write?.save()
    }

    // MARK: - Settings

    private func makeSettingsPages() -> SettingsPages {
        var pages = SettingsPages(settings: keyboardSettings, permission: permission)
        pages[.voice] = AnyView(VoiceSettingsPage(speech: speech))
        pages[.speech] = AnyView(SpeechPage(speech: speech, settings: keyboardSettings, said: controller.talk.said))
        pages[.predictions] = AnyView(PredictionsSettingsPage(engine: session.predictions))
        pages[.clipboard] = AnyView(ClipboardSettingsPage(history: session.clipboard))
        pages[.appPanels] = AnyView(
            AppPanelsSettingsPage(model: session.appPanels, inputMonitoring: inputMonitoring))
        if let store = session.userPanel {
            pages[.myPanel] = AnyView(MyPanelSettingsPage(store: store, usage: session.userPanelUsage))
        } else if let error = session.userPanelError {
            pages[.myPanel] = AnyView(
                ContentUnavailableView(
                    "My Panel", systemImage: "exclamationmark.triangle", description: Text(error)))
        }
        return pages
    }

    /// Adds each copy to the clipboard history. macOS has no notification for
    /// a change of the clipboard, so the keyboard reads its change count every
    /// 0.5 seconds.
    private func watchClipboard() {
        let watcher = ClipboardWatcher(
            pasteboard: session.pasteboard, history: session.clipboard,
            shouldSkip: { [weak self] in
                guard let controller = self?.controller else { return true }
                return controller.isFieldPrivate || controller.focusedField?.isSecure == true
            },
            onChange: { [weak self] in self?.session.pasteboardChanged() })
        clipboardWatcher = watcher
        clipboardTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { _ in
            MainActor.assumeIsolated { watcher.poll() }
        }
    }

    /// The Look page and the Speech page change the keyboard at once.
    private func followSettings() {
        keyboardSettings.$style
            .sink { [weak self] style in self?.controller.style = style }
            .store(in: &subscriptions)
        keyboardSettings.$returnSpeaksInTalk
            .sink { [weak self] speaks in self?.controller.talk.returnSpeaks = speaks }
            .store(in: &subscriptions)
    }

    private func showSettings(_ page: SettingsPage = .voice) {
        session.predictions.refreshAvailability()
        startChordTap()
        settingsWindow.show(page)
    }

    // MARK: - The app in front

    private func watchFocus() {
        // Mirror the focused field of whatever app is in front, and re-read it
        // after every key we send — some apps never announce their own changes.
        focusWatcher.onChange = { [weak self] field in
            guard let self else { return }
            self.controller.focusChanged(to: field)
            // A field that empties was sent, and the chat above it changed.
            let isEmpty = field?.text?.isEmpty ?? true
            if isEmpty, !self.fieldWasEmpty { self.readScreenSoon() }
            self.fieldWasEmpty = isEmpty
        }
        focusWatcher.onFocusMoved = { [weak self] in
            self?.session.focusMoved()
            self?.readScreenSoon()
            // The tree only needs rebuilding when focus lands somewhere else;
            // the text of the field it is already showing is caught by the
            // slow timer.
            self?.scheduleTreeRefresh()
        }
        focusWatcher.onAppChanged = { [weak self] app, title in
            guard let self else { return }
            self.apply(self.tracker.appActivated(app.map(FrontApp.init)), app: app, title: title)
        }
        focusWatcher.onWindowTitleChanged = { [weak self] title in
            self?.session.windowTitleChanged(title)
        }
        sink.afterPost = { [weak self] in
            self?.focusWatcher.refreshSoon()
        }
        focusWatcher.start()
        session.predictions.$screenEnabled
            .dropFirst()
            .sink { [weak self] isOn in
                if isOn { self?.readScreenSoon(enabled: true) } else { self?.screenRead?.cancel() }
            }
            .store(in: &subscriptions)
    }

    /// Reads the text near the field of the app in front, off the main
    /// thread, when the user turned it on. A newer read cancels this one.
    private func readScreenSoon(enabled: Bool? = nil) {
        screenRead?.cancel()
        guard enabled ?? session.predictions.screenEnabled, !isWriteInFront, mode == .type,
            !controller.isFieldPrivate,
            let app = NSWorkspace.shared.frontmostApplication,
            app.processIdentifier != ProcessInfo.processInfo.processIdentifier
        else { return }
        let request = ScreenContextReader.Request(app: app, rules: contextRules)
        screenRead = Task { [weak self] in
            // Lets the focus settle after a switch.
            try? await Task.sleep(for: .milliseconds(150))
            guard !Task.isCancelled else { return }
            let screen = await Task.detached { ScreenContextReader.read(request) }.value
            guard !Task.isCancelled else { return }
            self?.session.screenRead(screen)
        }
    }

    private func writeKeyChanged(_ isKey: Bool) {
        let front = NSWorkspace.shared.frontmostApplication
        let change = tracker.writeKeyChanged(isKey, front: front.map(FrontApp.init))
        apply(change, app: front, title: focusWatcher.windowTitle(of: front))
        // The app in front may have come forward while the Write paper was
        // key. Follow it again, so its field shows in the bar.
        if case .app = change { focusWatcher.refollow() }
    }

    private func apply(_ change: FrontAppTracker.Switch?, app: NSRunningApplication?, title: String?) {
        switch change {
        case nil:
            return
        case .write:
            isWriteInFront = true
            appIcon = NSApp.applicationIconImage.tabIcon()
            session.menuName = { _ in nil }
            session.appChanged(name: "Write", bundleID: write.panel, windowTitle: nil)
            session.writeCaretRead(write.caret)
        case .app:
            isWriteInFront = false
            appIcon = app?.icon?.tabIcon()
            session.menuName = { [weak app] chord in
                // The menu bar runs to hundreds of items, so it is read only
                // when a chord is about to join the panel.
                app.flatMap(MenuBarReader.index(for:))?.name(for: chord)
            }
            session.appChanged(name: app?.localizedName, bundleID: app?.bundleIdentifier, windowTitle: title)
            startChordTap()
            readScreenSoon()
        }
        updateAppPanel()
    }

    /// The paper turned into the desk, or the desk into the paper: the app
    /// panel changes between the Write keys and the Documents keys.
    private func writePanelChanged() {
        guard isWriteInFront else { return }
        session.appChanged(name: "Write", bundleID: write.panel, windowTitle: nil)
        session.writeCaretRead(write.caret)
        updateAppPanel()
    }

    private func updateAppPanel() {
        // The new panel gets the icon of the app. The top of the panel stays
        // in line with the top of the keys.
        if let window = panels[.app] {
            let top = window.frame.maxY
            window.update(root: content.panel(.app, appIcon: appIcon), contentSize: panelSize(.app))
            window.setFrameOrigin(NSPoint(x: window.frame.minX, y: top - window.frame.height))
        }
    }

    // MARK: - Write

    /// Opens the Write paper out of the input bar. If the keyboard is
    /// hidden, the paper opens with no animation.
    private func showWrite() {
        let keyboard = keyboardPanel?.isVisible == true ? keyboardPanel : nil
        let screen = (keyboard?.screen ?? FloatingPanel.activeScreen)?.visibleFrame ?? .zero
        let bar = keyboard.map { WritePlacement.screenRect(session.inputBar.frame, in: $0.frame) }
        write.show(
            from: bar, floor: keyboard?.frame.maxY ?? screen.minY, screen: screen,
            margin: FloatingPanel.margin)
    }

    /// The keyboard cannot read its own window over accessibility, so the
    /// editor reports the paragraph at the caret.
    private func writeCaretChanged(_ caret: EditorCaret) {
        guard isWriteInFront else { return }
        session.writeCaretRead(caret)
    }

    // MARK: - Learning from the hardware keyboard

    /// Starts the tap only when macOS already allows it, so launch never
    /// prompts. The App Panels page asks.
    private func startChordTap() {
        guard chordTap == nil else { return }
        guard ChordTap.isAllowed else {
            inputMonitoring.isAllowed = false
            return
        }
        let tap = ChordTap { [weak self] chord in self?.session.chordPressed(chord) }
        if tap.start() {
            chordTap = tap
            inputMonitoring.isAllowed = true
        } else {
            inputMonitoring.isAllowed = false
        }
    }

    // MARK: - Windows

    private func showWindows() {
        let (root, size) = makeKeyboardRoot()
        let keyboard = FloatingPanel(root: root, contentSize: size)
        keyboard.placement = .free
        keyboardPanel = keyboard

        let sizes = Dictionary(uniqueKeysWithValues: DetachedPanel.allCases.map { ($0, panelSize($0)) })
        let keysSize = WindowContent.measure(content.keysCard())
        let visible = FloatingPanel.activeScreen?.visibleFrame ?? .zero
        let screens = NSScreen.screens.map(\.visibleFrame)
        // The place where the user dragged the keyboard, if it is on a screen.
        let origin = KeyboardPosition.origin(
            saved: keyboardPosition.saved, size: size, screens: screens,
            fallback: KeyboardPosition.typeWindowOrigin(
                forKeys: PanelPlacement.keysOrigin(
                    keysSize: keysSize, panels: sizes, in: visible, rightInset: reservedWidth,
                    margin: FloatingPanel.margin)))
        keyboard.setFrameOrigin(origin)
        keyboard.orderFront(nil)
        observers.append(
            NotificationCenter.default.addObserver(
                forName: NSWindow.didMoveNotification, object: keyboard, queue: .main
            ) { [weak self] _ in
                MainActor.assumeIsolated { self?.keyboardMoved() }
            })

        let keys = CGRect(origin: KeyboardPosition.keysOrigin(ofWindow: origin, in: .type), size: keysSize)
        let defaults = PanelPlacement.defaultFrames(keys: keys, sizes: sizes)
        for panel in DetachedPanel.allCases {
            let window = FloatingPanel(root: content.panel(panel, appIcon: appIcon), contentSize: sizes[panel]!)
            window.placement = .free
            // The panels sit above the keyboard window, whose clear corners
            // reach over them.
            window.level = NSWindow.Level(rawValue: NSWindow.Level.floating.rawValue + 1)
            if !window.setFrameUsingName(panel.frameName) || !PanelPlacement.isVisible(window.frame, on: screens) {
                window.setFrameOrigin(defaults[panel]?.origin ?? .zero)
            }
            window.setContentSize(sizes[panel]!)
            window.setFrameAutosaveName(panel.frameName)
            window.orderFront(nil)
            panels[panel] = window
        }

        showTreePanel(height: size.height)
    }

    /// Moves the shortcut panels around the keys, where the keyboard is now.
    /// The panels save their new frames.
    private func arrangePanels() {
        guard let keyboard = keyboardPanel else { return }
        let keys = CGRect(
            origin: KeyboardPosition.keysOrigin(ofWindow: keyboard.frame.origin, in: mode),
            size: WindowContent.measure(content.keysCard()))
        let screen = (keyboard.screen ?? FloatingPanel.activeScreen)?.visibleFrame ?? keys
        let sizes = panels.mapValues(\.frame.size)
        for (panel, frame) in PanelPlacement.arrangedFrames(keys: keys, sizes: sizes, screen: screen) {
            panels[panel]?.setFrame(frame, display: true, animate: true)
        }
    }

    /// Keeps the place of the keyboard for the next launch, as the place of
    /// its Type mode window.
    private func keyboardMoved() {
        guard let keyboardPanel else { return }
        keyboardPosition.saved = KeyboardPosition.typeOrigin(of: keyboardPanel.frame.origin, in: mode)
    }

    private func panelSize(_ panel: DetachedPanel) -> CGSize {
        WindowContent.measure(content.panel(panel, appIcon: appIcon))
    }

    /// Builds the keyboard window and measures it, scaling down if the
    /// display is too narrow for it.
    private func makeKeyboardRoot() -> (AnyView, CGSize) {
        let screen = content.keyboard()
        let intrinsic = WindowContent.measure(screen)

        var scale: CGFloat = 1
        // The screen of the keyboard, or before it shows, the screen that
        // holds the pointer.
        if let screen = keyboardPanel?.screen ?? FloatingPanel.activeScreen, intrinsic.width > 0 {
            let available = screen.visibleFrame.width - 2 * FloatingPanel.margin - reservedWidth
            scale = min(1, available / intrinsic.width)
        }
        let size = CGSize(width: intrinsic.width * scale, height: intrinsic.height * scale)
        let root = AnyView(
            screen
                .scaleEffect(scale, anchor: .topLeading)
                .frame(width: size.width, height: size.height)
        )
        return (root, size)
    }

    /// Rebuilds the keyboard window at its new size. The bottom left corner
    /// stays, less `shift`.
    private func refreshKeyboard(shift: CGFloat = 0) {
        guard let keyboardPanel else { return }
        let origin = keyboardPanel.frame.origin
        let (root, size) = makeKeyboardRoot()
        keyboardPanel.update(root: root, contentSize: size)
        keyboardPanel.setFrameOrigin(NSPoint(x: origin.x - shift, y: origin.y))
        // The viewer takes its height from the keyboard beside it.
        showTreePanel(height: size.height)
    }

    /// Talk mode puts Phrases and the Said list in the keyboard window and
    /// hides the shortcut panels. The keys stay where they are on the screen.
    private func modeChanged(to mode: KeyboardMode) {
        let shift = KeyboardScreen.keysInset(mode) - KeyboardScreen.keysInset(self.mode)
        self.mode = mode
        refreshKeyboard(shift: shift)
        guard keyboardPanel?.isVisible == true else { return }
        for window in panels.values {
            if mode == .talk { window.orderOut(nil) } else { window.orderFront(nil) }
        }
    }

    // MARK: - The tree viewer

    private func showTreePanel(height: CGFloat) {
        guard isTreeVisible else { return }
        let size = CGSize(width: Metrics.treeViewerWidth, height: height)
        let root = AnyView(AXTreeView(model: treeModel, permission: permission, height: height))

        if let treePanel {
            treePanel.update(root: root, contentSize: size)
        } else {
            let treePanel = FloatingPanel(root: root, contentSize: size)
            treePanel.placement = .bottomRight
            treePanel.orderFront(nil)
            self.treePanel = treePanel
        }
        refreshTree()
    }

    private func refreshTree() {
        guard isTreeVisible else { return }
        let tree = AXTreeReader.read(app: NSWorkspace.shared.frontmostApplication)
        treeModel.tree = controller.isFieldPrivate ? tree.hidingFocusedValue() : tree
    }

    /// Each read costs many round trips to the other app, so focus moves and
    /// app switches coalesce into one read.
    private func scheduleTreeRefresh() {
        guard isTreeVisible, !treeRefreshScheduled else { return }
        treeRefreshScheduled = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.treeRefreshScheduled = false
            self?.refreshTree()
        }
    }

    // MARK: - The menu bar item

    private func installStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.image = NSImage(
            systemSymbolName: "keyboard",
            accessibilityDescription: "September Keyboard"
        )

        let menu = NSMenu()
        menu.delegate = self
        let keyboardItem = menu.addItem(
            withTitle: "",
            action: #selector(toggleKeyboard),
            keyEquivalent: ""
        )
        keyboardItem.target = self
        self.keyboardItem = keyboardItem
        let treeItem = menu.addItem(
            withTitle: "Accessibility Tree",
            action: #selector(toggleTree),
            keyEquivalent: ""
        )
        treeItem.target = self
        treeItem.state = isTreeVisible ? .on : .off
        menu.addItem(.separator())

        menu.addItem(withTitle: "Write", action: #selector(openWrite), keyEquivalent: "").target = self
        menu.addItem(withTitle: "Arrange Panels", action: #selector(arrangePanelsFromMenu), keyEquivalent: "")
            .target = self
        menu.addItem(withTitle: "Settings…", action: #selector(openSettings), keyEquivalent: ",").target =
            self

        let styleItem = NSMenuItem(title: "Style", action: nil, keyEquivalent: "")
        let styleMenu = NSMenu()
        for style in KeyboardStyle.allCases {
            let entry = NSMenuItem(
                title: style.title,
                action: #selector(selectStyle(_:)),
                keyEquivalent: ""
            )
            entry.target = self
            entry.representedObject = style.rawValue
            styleMenu.addItem(entry)
        }
        styleItem.submenu = styleMenu
        self.styleMenu = styleMenu
        menu.addItem(styleItem)

        menu.addItem(.separator())
        menu.addItem(
            withTitle: "Accessibility Permission…",
            action: #selector(openPermissionSettings),
            keyEquivalent: ""
        ).target = self
        menu.addItem(
            withTitle: "Quit September Keyboard",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        )

        item.menu = menu
        statusItem = item
    }

    func menuWillOpen(_ menu: NSMenu) {
        keyboardItem?.title = keyboardPanel?.isVisible == true ? "Hide Keyboard" : "Show Keyboard"
        for entry in styleMenu?.items ?? [] {
            entry.state = entry.representedObject as? String == keyboardSettings.style.rawValue ? .on : .off
        }
    }

    @objc private func toggleKeyboard(_ sender: NSMenuItem) {
        guard let keyboardPanel else { return }
        let windows = [keyboardPanel] + (mode == .type ? Array(panels.values) : [])
        if keyboardPanel.isVisible {
            windows.forEach { $0.orderOut(nil) }
        } else {
            // The keyboard may show on another screen now, so it is sized
            // again.
            refreshKeyboard()
            windows.forEach { $0.orderFront(nil) }
        }
    }

    @objc private func toggleTree(_ sender: NSMenuItem) {
        isTreeVisible.toggle()
        sender.state = isTreeVisible ? .on : .off
        if isTreeVisible {
            treePanel?.orderFront(nil)
        } else {
            treePanel?.orderOut(nil)
        }
        refreshKeyboard()
    }

    @objc private func openWrite() {
        showWrite()
    }

    @objc private func arrangePanelsFromMenu() {
        arrangePanels()
    }

    @objc private func openSettings() {
        showSettings()
    }

    @objc private func selectStyle(_ sender: NSMenuItem) {
        guard
            let raw = sender.representedObject as? String,
            let style = KeyboardStyle(rawValue: raw)
        else { return }
        keyboardSettings.style = style
    }

    @objc private func openPermissionSettings() {
        permission.openSettings()
    }

    private func fail(loadingPanels error: any Error) {
        let alert = NSAlert()
        alert.messageText = "September Keyboard could not load its shortcut panels."
        alert.informativeText = String(describing: error)
        NSApp.activate()
        alert.runModal()
        NSApp.terminate(nil)
    }

    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool { true }
}

/// The Speech page with the Return key setting of Talk mode and the Talk
/// history.
private struct SpeechPage: View {
    let speech: SpeechServices
    @ObservedObject var settings: KeyboardSettings
    let said: SaidList

    var body: some View {
        SpeechSettingsPage(
            speech: speech, returnSpeaks: $settings.returnSpeaksInTalk, onClearTalkHistory: said.clear)
    }
}
