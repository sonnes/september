import AppKit
import SwiftData
import SwiftUI

@main
struct SeptemberApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var body: some Scene {
        // Real UI lives in the FloatingPanels created by AppDelegate.
        // Settings scene satisfies SwiftUI's requirement for at least one scene.
        Settings {
            EmptyView()
        }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var keyboardPanel: FloatingPanel?
    private var predictionsPanel: FloatingPanel?
    private var settingsWindow: NSWindow?
    private var statusItem: NSStatusItem?
    private var menuBarPollingTask: Task<Void, Never>?
    private let accessibility = AccessibilityManager()
    private let modifierState = ModifierState()
    private let predictionEngine = PredictionEngine()
    private let axTextService = AXTextService()
    private let speechCoordinator = SpeechCoordinator()
    private var modelContainer: ModelContainer?
    private var positionObservations: [NSObjectProtocol] = []
    private var fittingSizeObservation: NSKeyValueObservation?

    @AppStorage("appTheme") private var appTheme: AppTheme = .system

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.appearance = appTheme.nsAppearance
        accessibility.requestPermission()

        do {
            let schema = Schema([Account.self, Document.self, Panel.self, PanelButton.self])
            modelContainer = try ModelContainer(for: schema)
            ensureDefaultAccount()
        } catch {
            fatalError("Failed to create ModelContainer: \(error)")
        }

        setupKeyboardPanel()
        setupPredictionsPanel()
        setupMenuBar()
    }

    // MARK: - Default Account

    private func ensureDefaultAccount() {
        guard let container = modelContainer else { return }
        let context = ModelContext(container)
        let descriptor = FetchDescriptor<Account>()
        let count = (try? context.fetchCount(descriptor)) ?? 0
        if count == 0 {
            context.insert(Account(name: "Default"))
            try? context.save()
        }
    }

    // MARK: - Keyboard Panel

    private func setupKeyboardPanel() {
        let rootView = KeyboardAssemblyView(
            modifierState: modifierState,
            accessibilityManager: accessibility,
            predictionEngine: predictionEngine,
            axTextService: axTextService,
            speechCoordinator: speechCoordinator,
            onSettingsTapped: { [weak self] in self?.openSettings() }
        )
        .modelContainer(modelContainer!)

        let hostingView = NSHostingView(rootView: rootView)
        hostingView.translatesAutoresizingMaskIntoConstraints = false

        keyboardPanel = FloatingPanel(
            contentView: hostingView,
            frameKey: "FloatingPanelFrame"
        )
        keyboardPanel?.orderFront(nil)
    }

    // MARK: - Predictions Panel (transparent, above keyboard)

    private func setupPredictionsPanel() {
        let rootView = PredictionsFloatingView(
            predictionEngine: predictionEngine,
            axTextService: axTextService,
            accessibilityManager: accessibility
        )
        .modelContainer(modelContainer!)

        let hostingView = NSHostingView(rootView: rootView)
        hostingView.translatesAutoresizingMaskIntoConstraints = false

        let panel = FloatingPanel(
            contentView: hostingView,
            minWidth: 400,
            minHeight: 1,
            frameKey: "PredictionsPanelFrame"
        )

        // Fully transparent — no chrome, no background, no corner radius
        panel.contentView?.layer?.cornerRadius = 0
        panel.contentView?.layer?.masksToBounds = false
        panel.contentView?.layer?.backgroundColor = .clear
        panel.styleMask = [.nonactivatingPanel]
        panel.isMovableByWindowBackground = false
        panel.hasShadow = false

        predictionsPanel = panel

        // Auto-resize predictions panel to fit content
        fittingSizeObservation = hostingView.observe(\.fittingSize, options: [.new]) {
            [weak self] view, change in
            guard let self, let newSize = change.newValue else { return }
            DispatchQueue.main.async {
                self.resizePredictionsPanel(to: newSize)
            }
        }

        // Position above keyboard panel and track its movement
        positionPredictionsPanel()
        panel.orderFront(nil)

        positionObservations.append(
            NotificationCenter.default.addObserver(
                forName: NSWindow.didMoveNotification, object: keyboardPanel, queue: .main
            ) { [weak self] _ in
                Task { @MainActor in self?.positionPredictionsPanel() }
            }
        )

        positionObservations.append(
            NotificationCenter.default.addObserver(
                forName: NSWindow.didResizeNotification, object: keyboardPanel, queue: .main
            ) { [weak self] _ in
                Task { @MainActor in self?.positionPredictionsPanel() }
            }
        )
    }

    /// Position predictions panel centered above the keyboard panel.
    private func positionPredictionsPanel() {
        guard let keyboard = keyboardPanel, let predictions = predictionsPanel else { return }

        let kbFrame = keyboard.frame
        let predSize = predictions.frame.size

        // Center horizontally over keyboard, place directly above
        let x = kbFrame.origin.x + (kbFrame.width - predSize.width) / 2
        let y = kbFrame.origin.y + kbFrame.height + 4  // 4pt gap

        predictions.setFrameOrigin(NSPoint(x: x, y: y))
    }

    /// Resize predictions panel to fit its content, then reposition.
    private func resizePredictionsPanel(to size: NSSize) {
        guard let predictions = predictionsPanel else { return }
        let width = max(size.width, 600)
        let height = max(size.height, 1)

        // Resize and reposition
        predictions.setContentSize(NSSize(width: width, height: height))
        positionPredictionsPanel()
    }

    // MARK: - Settings Window

    private func openSettings() {
        if let existing = settingsWindow, existing.isVisible {
            existing.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }

        let settingsView = SettingsView()
            .modelContainer(modelContainer!)

        let hostingView = NSHostingView(rootView: settingsView)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 750, height: 500),
            styleMask: [.titled, .closable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.contentView = hostingView
        window.title = "September Settings"
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        settingsWindow = window
    }

    // MARK: - Menu Bar

    private func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)

        if let button = statusItem?.button {
            button.image = NSImage(
                systemSymbolName: "keyboard",
                accessibilityDescription: "September"
            )
        }

        let menu = NSMenu()

        let showItem = NSMenuItem(
            title: "Show Keyboard",
            action: #selector(showKeyboard),
            keyEquivalent: "k"
        )
        showItem.keyEquivalentModifierMask = [.command, .shift]
        menu.addItem(showItem)

        let hideItem = NSMenuItem(
            title: "Hide Keyboard",
            action: #selector(hideKeyboard),
            keyEquivalent: "k"
        )
        hideItem.keyEquivalentModifierMask = [.command, .shift, .option]
        menu.addItem(hideItem)

        menu.addItem(.separator())

        let accessibilityItem = NSMenuItem(
            title: "Accessibility: Checking…",
            action: nil,
            keyEquivalent: ""
        )
        accessibilityItem.tag = 100
        menu.addItem(accessibilityItem)
        updateAccessibilityMenuItem()

        menu.addItem(.separator())

        menu.addItem(
            NSMenuItem(
                title: "Quit September",
                action: #selector(NSApplication.terminate(_:)),
                keyEquivalent: "q"
            )
        )

        statusItem?.menu = menu

        menuBarPollingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(2))
                updateAccessibilityMenuItem()
            }
        }
    }

    private func updateAccessibilityMenuItem() {
        guard let menu = statusItem?.menu,
            let item = menu.item(withTag: 100)
        else { return }

        if accessibility.isGranted {
            item.title = "Accessibility: Granted"
            item.image = NSImage(
                systemSymbolName: "checkmark.circle.fill",
                accessibilityDescription: nil
            )
        } else {
            item.title = "Grant Accessibility…"
            item.action = #selector(requestAccessibility)
            item.target = self
            item.image = NSImage(
                systemSymbolName: "exclamationmark.triangle",
                accessibilityDescription: nil
            )
        }
    }

    @objc private func showKeyboard() {
        keyboardPanel?.orderFront(nil)
        predictionsPanel?.orderFront(nil)
    }

    @objc private func hideKeyboard() {
        keyboardPanel?.orderOut(nil)
        predictionsPanel?.orderOut(nil)
    }

    @objc private func requestAccessibility() {
        accessibility.requestPermission()
        updateAccessibilityMenuItem()
    }
}
