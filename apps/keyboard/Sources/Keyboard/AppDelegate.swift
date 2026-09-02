import AppKit
import Combine
import SeptemberKit
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var panel: FloatingPanel?
    private var treePanel: FloatingPanel?
    private var statusItem: NSStatusItem?
    private var permissionSubscription: AnyCancellable?
    private let permission = AccessibilityPermission()
    private let sink = CGEventSink()
    private let focusWatcher = FocusWatcher()
    private let treeModel = AXTreeModel()
    private lazy var controller = KeyboardController(sink: sink)

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
        // Only check at launch. The prompt is shown when the user asks for it
        // from the banner or the menu, so starting Keyboard never throws a
        // system dialog in front of what they were doing.
        permission.startMonitoring()

        controller.onOpenPermissionSettings = { [permission] in
            permission.request()
            permission.openSettings()
        }
        permissionSubscription = permission.$isTrusted.sink { [weak self] trusted in
            Task { @MainActor in
                self?.controller.isAccessibilityTrusted = trusted
                self?.refreshPanel()
            }
        }

        // Mirror the focused field of whatever app is in front, and re-read it
        // after every key we send — some apps never announce their own changes.
        focusWatcher.onChange = { [weak self] field in
            self?.controller.focusChanged(to: field)
        }
        // The tree only needs rebuilding when focus lands somewhere else; the
        // text of the field it is already showing is caught by the slow timer.
        focusWatcher.onFocusMoved = { [weak self] in self?.scheduleTreeRefresh() }
        focusWatcher.onAppChanged = { [weak self] app in
            self?.controller.appChanged(
                name: app?.localizedName ?? "Finder", bundleID: app?.bundleIdentifier)
        }
        sink.afterPost = { [weak self] in self?.focusWatcher.refreshSoon() }
        focusWatcher.start()

        treeModel.onRefresh = { [weak self] in self?.refreshTree() }
        // Values in the tree age between focus changes — keep them fresh
        // enough to trust without rebuilding it on every keystroke.
        treeTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.refreshTree() }
        }
        let (root, size) = makeRoot()
        let panel = FloatingPanel(root: root, contentSize: size)
        panel.placement = .bottomCenter(rightInset: reservedWidth)
        panel.orderFront(nil)
        self.panel = panel

        showTreePanel(height: size.height)
        installStatusItem()
    }

    // MARK: - The tree viewer

    private func showTreePanel(height: CGFloat) {
        guard isTreeVisible else { return }
        let size = CGSize(width: Metrics.treeViewerWidth, height: height)
        let root = AnyView(AXTreeView(model: treeModel, height: height))

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
        treeModel.isTrusted = permission.isTrusted
        treeModel.tree = AXTreeReader.read(app: NSWorkspace.shared.frontmostApplication)
    }

    /// Reading a whole tree costs hundreds of round trips to the other app, so
    /// keystrokes and app switches coalesce into one read.
    private func scheduleTreeRefresh() {
        guard isTreeVisible, !treeRefreshScheduled else { return }
        treeRefreshScheduled = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.treeRefreshScheduled = false
            self?.refreshTree()
        }
    }

    /// Builds the screen and measures it, scaling down if the display is too
    /// narrow for the full 1660pt layout.
    private func makeRoot() -> (AnyView, CGSize) {
        let screen = KeyboardScreen().environmentObject(controller)
        let probe = NSHostingView(rootView: screen)
        probe.layoutSubtreeIfNeeded()
        let intrinsic = probe.fittingSize

        let available = (NSScreen.main?.visibleFrame.width ?? 1440) - 48 - reservedWidth
        let scale = intrinsic.width > 0 ? min(1, available / intrinsic.width) : 1
        let size = CGSize(width: intrinsic.width * scale, height: intrinsic.height * scale)

        let root = AnyView(
            screen
                .scaleEffect(scale, anchor: .topLeading)
                .frame(width: size.width, height: size.height)
        )
        return (root, size)
    }

    private func refreshPanel() {
        guard let panel else { return }
        let (root, size) = makeRoot()
        panel.placement = .bottomCenter(rightInset: reservedWidth)
        panel.update(root: root, contentSize: size)
        // The viewer takes its height from the keyboard beside it.
        showTreePanel(height: size.height)
    }

    private func installStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.image = NSImage(
            systemSymbolName: "keyboard",
            accessibilityDescription: "Keyboard"
        )

        let menu = NSMenu()
        menu.addItem(
            withTitle: "Show Keyboard",
            action: #selector(toggleKeyboard),
            keyEquivalent: ""
        ).target = self
        let treeItem = menu.addItem(
            withTitle: "Accessibility Tree",
            action: #selector(toggleTree),
            keyEquivalent: ""
        )
        treeItem.target = self
        treeItem.state = isTreeVisible ? .on : .off
        menu.addItem(.separator())

        let styleItem = NSMenuItem(title: "Style", action: nil, keyEquivalent: "")
        let styleMenu = NSMenu()
        for style in KeyboardStyle.allCases {
            let entry = NSMenuItem(
                title: style.rawValue.capitalized,
                action: #selector(selectStyle(_:)),
                keyEquivalent: ""
            )
            entry.target = self
            entry.representedObject = style.rawValue
            entry.state = style == controller.style ? .on : .off
            styleMenu.addItem(entry)
        }
        styleItem.submenu = styleMenu
        menu.addItem(styleItem)

        menu.addItem(.separator())
        menu.addItem(
            withTitle: "Accessibility Permission…",
            action: #selector(openPermissionSettings),
            keyEquivalent: ""
        ).target = self
        menu.addItem(
            withTitle: "Quit Keyboard",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        )

        item.menu = menu
        statusItem = item
    }

    @objc private func toggleKeyboard(_ sender: NSMenuItem) {
        guard let panel else { return }
        if panel.isVisible {
            panel.orderOut(nil)
            sender.title = "Show Keyboard"
        } else {
            panel.position()
            panel.orderFront(nil)
            sender.title = "Hide Keyboard"
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
        // The keyboard reclaims the space the viewer was holding.
        refreshPanel()
    }

    @objc private func selectStyle(_ sender: NSMenuItem) {
        guard
            let raw = sender.representedObject as? String,
            let style = KeyboardStyle(rawValue: raw)
        else { return }
        controller.style = style
        sender.menu?.items.forEach { $0.state = $0 === sender ? .on : .off }
    }

    @objc private func openPermissionSettings() {
        permission.request()
        permission.openSettings()
    }

    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool { true }
}
