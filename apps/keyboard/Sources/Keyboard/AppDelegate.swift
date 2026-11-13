import AppKit
import Combine
import SeptemberKit
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var keyboardPanel: FloatingPanel?
    private var panels: [DetachedPanel: FloatingPanel] = [:]
    private var debugPanel: FloatingPanel?
    private var statusItem: NSStatusItem?
    private var keyboardItem: NSMenuItem?
    private var styleMenu: NSMenu?
    private var subscriptions: Set<AnyCancellable> = []
    private var observers: [any NSObjectProtocol] = []
    private let permission = AccessibilityPermission()
    private let sink = CGEventSink()
    private let focusWatcher = FocusWatcher()
    private var debugModel: DebugPanelModel!
    private let keyboardPosition = KeyboardPosition()
    private var assembly: KeyboardAssembly!
    private var session: KeyboardSession { assembly.session }
    private var keyboardSettings: KeyboardSettings { assembly.settings }
    private var controller: KeyboardController { session.controller }
    private var speech: SpeechServices!
    private var history: SentenceHistory!
    private var content: WindowContent!
    private var settingsWindow: SettingsWindowController!
    private var write: WriteController!
    /// Held strongly: the event monitors hold it weakly.
    private var otherInput: OtherInputMonitor?
    /// SIGTERM and SIGINT, for example from `make stop`, skip
    /// `applicationWillTerminate`. These handlers release the modifiers first.
    private var signalSources: [DispatchSourceSignal] = []
    private var clipboardTimer: Timer?

    /// The Debug panel is on by default. It shows why an app does or does
    /// not mirror, and what the predictions get.
    private var isDebugVisible = true
    private var treeRefreshScheduled = false
    private var debugTimer: Timer?

    /// Room kept at the right edge for the Debug panel, so the keyboard
    /// centres in what is left instead of sliding under it.
    private var reservedWidth: CGFloat {
        isDebugVisible ? Metrics.treeViewerWidth + Metrics.sectionSpacing : 0
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let database = KeyboardDatabase.open(at: KeyboardDatabase.defaultURL)
        LegacyImport.run(database: database, folder: KeyboardDatabase.folder)
        speech = SpeechServices()
        speech.start()
        history = SentenceHistory(database: database)
        debugModel = DebugPanelModel(records: RecordBrowser(database: database))
        let predictions = PredictionEngine(history: history)
        write = WriteController(host: self)
        do {
            assembly = try KeyboardAssembly(
                sink: sink, database: database, pasteboard: SystemPasteboard(),
                reader: AXFrontAppReader(rules: try ContextRules.bundled()), speaker: speech.speaker,
                write: write, predictions: predictions)
        } catch {
            fail(loading: error)
            return
        }
        watchClipboard()

        settingsWindow = SettingsWindowController(pages: makeSettingsPages())
        content = WindowContent(
            session: session, permission: permission, phrases: assembly.phrases,
            presser: KeyPresser(timing: { KeyTiming.current() }),
            write: { [weak self] in self?.showWrite() },
            arrange: { [weak self] in self?.arrangePanels() },
            settings: { [weak self] in self?.showSettings() })

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
                // `@Published` sends the new mode before it stores it.
                guard let previous = self?.controller.mode else { return }
                Task { @MainActor in self?.modeChanged(from: previous, to: mode) }
            }
            .store(in: &subscriptions)
        // Private text in the field: the tree drops the value of the field.
        controller.$isFieldPrivate.dropFirst()
            .sink { [weak self] _ in Task { @MainActor in self?.refreshTree() } }
            .store(in: &subscriptions)

        watchFocus()
        let otherInput = OtherInputMonitor(
            onInput: { [weak self] in self?.controller.otherInputPressed() },
            onModifiers: { [weak self] in self?.controller.macModifiersChanged($0) },
            pointer: PointerRestTracker { [weak self] in self?.controller.pointerRested(at: $0) })
        otherInput.start()
        self.otherInput = otherInput
        releaseModifiersOnSignal()
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

        debugModel.onRefreshTree = { [weak self] in self?.refreshTree() }
        // Values in the tree and the records age between focus changes —
        // keep them fresh enough to trust without a read on every keystroke.
        debugTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.refreshDebug() }
        }

        showWindows()
        installStatusItem()
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        AppActivation.appBecameActive()
        assembly?.session.predictions.refreshAvailability()
    }

    func applicationWillTerminate(_ notification: Notification) {
        assembly?.session.controller.releaseSystemModifiers()
        write?.save()
    }

    // MARK: - Settings

    private func makeSettingsPages() -> SettingsPages {
        var pages = SettingsPages(settings: keyboardSettings, permission: permission)
        pages[.voice] = AnyView(VoiceSettingsPage(speech: speech))
        pages[.speech] = AnyView(SpeechPage(speech: speech, settings: keyboardSettings, said: controller.talk.said))
        pages[.predictions] = AnyView(
            PredictionsSettingsPage(
                engine: session.predictions, history: history))
        pages[.clipboard] = AnyView(ClipboardSettingsPage(history: session.clipboard))
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
    /// a change of the clipboard, so the keyboard reads its change count on a
    /// timer.
    private func watchClipboard() {
        clipboardTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.session.pollClipboard() }
        }
    }

    private func showSettings(_ page: SettingsPage = .voice) {
        session.predictions.refreshAvailability()
        settingsWindow.show(page)
    }

    // MARK: - The app in front

    private func watchFocus() {
        // Mirror the focused field of whatever app is in front, and re-read it
        // after every key we send — some apps never announce their own changes.
        focusWatcher.onChange = { [weak self] field in
            self?.session.focusChanged(to: field)
        }
        focusWatcher.onFocusMoved = { [weak self] in
            self?.session.focusMoved()
            // The tree only needs rebuilding when focus lands somewhere else;
            // the text of the field it is already showing is caught by the
            // slow timer.
            self?.scheduleTreeRefresh()
        }
        focusWatcher.onAppChanged = { [weak self] app in
            self?.session.appActivated(app.map(FrontApp.init))
        }
        sink.afterPost = { [weak self] in
            self?.focusWatcher.refreshSoon()
        }
        focusWatcher.start()
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

    // MARK: - The modifiers of the hardware keyboard

    private func releaseModifiersOnSignal() {
        for number in [SIGTERM, SIGINT] {
            signal(number, SIG_IGN)
            let source = DispatchSource.makeSignalSource(signal: number, queue: .main)
            source.setEventHandler { [weak self] in
                MainActor.assumeIsolated {
                    self?.controller.releaseSystemModifiers()
                    NSApp.terminate(nil)
                }
            }
            source.resume()
            signalSources.append(source)
        }
    }

    // MARK: - Windows

    private func showWindows() {
        let (root, size) = makeKeyboardRoot()
        let keyboard = FloatingPanel(root: root, contentSize: size, placement: .free)
        keyboardPanel = keyboard

        let rectangleInstalled =
            NSWorkspace.shared.urlForApplication(withBundleIdentifier: DetachedPanel.rectangleBundleID) != nil
        let shown = DetachedPanel.shown(rectangleInstalled: rectangleInstalled)
        let sizes = Dictionary(uniqueKeysWithValues: shown.map { ($0, panelSize($0)) })
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
        for panel in shown {
            let window = FloatingPanel(root: content.panel(panel), contentSize: sizes[panel]!, placement: .free)
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

        showDebugPanel(height: size.height)
    }

    /// Moves the shortcut panels around the keys, where the keyboard is now.
    /// The panels save their new frames.
    private func arrangePanels() {
        guard let keyboard = keyboardPanel else { return }
        let keys = CGRect(
            origin: KeyboardPosition.keysOrigin(ofWindow: keyboard.frame.origin, in: controller.mode),
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
        keyboardPosition.saved = KeyboardPosition.typeOrigin(of: keyboardPanel.frame.origin, in: controller.mode)
    }

    private func panelSize(_ panel: DetachedPanel) -> CGSize {
        WindowContent.measure(content.panel(panel))
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
    /// stays.
    private func refreshKeyboard() {
        guard let keyboardPanel else { return }
        let origin = keyboardPanel.frame.origin
        let (root, size) = makeKeyboardRoot()
        keyboardPanel.update(root: root, contentSize: size)
        keyboardPanel.setFrameOrigin(origin)
        // The Debug panel takes its height from the keyboard beside it.
        showDebugPanel(height: size.height)
    }

    /// Talk mode puts Phrases and the Said list in the keyboard window and
    /// hides the shortcut panels. The keys stay where they are on the screen.
    private func modeChanged(from previous: KeyboardMode, to mode: KeyboardMode) {
        guard let keyboardPanel else { return }
        let typeOrigin = KeyboardPosition.typeOrigin(of: keyboardPanel.frame.origin, in: previous)
        refreshKeyboard()
        keyboardPanel.setFrameOrigin(KeyboardPosition.windowOrigin(typeOrigin, in: mode))
        guard keyboardPanel.isVisible else { return }
        for window in panels.values {
            if DetachedPanel.isShown(in: mode) { window.orderFront(nil) } else { window.orderOut(nil) }
        }
    }

    // MARK: - The Debug panel

    private func showDebugPanel(height: CGFloat) {
        guard isDebugVisible else { return }
        let size = CGSize(width: Metrics.treeViewerWidth, height: height)
        let root = AnyView(
            DebugPanelView(
                model: debugModel, predictions: session.predictions, permission: permission, height: height))

        if let debugPanel {
            debugPanel.update(root: root, contentSize: size)
        } else {
            let debugPanel = FloatingPanel(root: root, contentSize: size, placement: .bottomRight)
            debugPanel.orderFront(nil)
            self.debugPanel = debugPanel
        }
        refreshDebug()
    }

    /// Reads the tree, and the records while the Records tab shows.
    private func refreshDebug() {
        refreshTree()
        if isDebugVisible, debugModel.tab == .records { debugModel.reloadRecords() }
    }

    private func refreshTree() {
        guard isDebugVisible else { return }
        let tree = AXTreeReader.read(app: NSWorkspace.shared.frontmostApplication)
        debugModel.tree.show(tree, hidingFocusedValue: controller.hidesFieldText)
    }

    /// Each read costs many round trips to the other app, so focus moves and
    /// app switches coalesce into one read.
    private func scheduleTreeRefresh() {
        guard isDebugVisible, !treeRefreshScheduled else { return }
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
        let debugItem = menu.addItem(
            withTitle: "Debug Panel",
            action: #selector(toggleDebug),
            keyEquivalent: ""
        )
        debugItem.target = self
        debugItem.state = isDebugVisible ? .on : .off
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
        let windows = [keyboardPanel] + (DetachedPanel.isShown(in: controller.mode) ? Array(panels.values) : [])
        if keyboardPanel.isVisible {
            windows.forEach { $0.orderOut(nil) }
        } else {
            // The keyboard may show on another screen now, so it is sized
            // again.
            refreshKeyboard()
            windows.forEach { $0.orderFront(nil) }
        }
    }

    @objc private func toggleDebug(_ sender: NSMenuItem) {
        isDebugVisible.toggle()
        sender.state = isDebugVisible ? .on : .off
        if isDebugVisible {
            debugPanel?.orderFront(nil)
        } else {
            debugPanel?.orderOut(nil)
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

    /// A bundled file of the keyboard did not load: a panel, the accents,
    /// the Phrases panel, or a context rule.
    private func fail(loading error: any Error) {
        let alert = NSAlert()
        alert.messageText = "September Keyboard could not load its bundled files."
        alert.informativeText = String(describing: error)
        NSApp.activate()
        alert.runModal()
        NSApp.terminate(nil)
    }

    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool { true }
}

extension AppDelegate: WriteHost {
    func bringToFront(_ window: NSWindow) {
        AppActivation.bringToFront(window)
    }

    func windowClosed(_ window: NSWindow) {
        AppActivation.windowClosed(window)
    }

    func writeKeyChanged(_ isKey: Bool) {
        let front = NSWorkspace.shared.frontmostApplication.map(FrontApp.init)
        let change = session.writeKeyChanged(isKey, panel: write.panel, front: front)
        // The app in front may have come forward while the Write paper was
        // key. Follow it again, so its field shows in the bar.
        if case .app = change { focusWatcher.refollow() }
    }

    func writePanelChanged(_ panel: WritePanel) {
        session.writePanelChanged(panel)
    }

    func writeCaretMoved(_ caret: EditorCaret) {
        session.writeCaretMoved(caret)
    }
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
