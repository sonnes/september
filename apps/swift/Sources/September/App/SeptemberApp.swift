import AppKit
import SwiftUI

@main
struct SeptemberApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var delegate

    var body: some Scene {
        // Real UI lives in the FloatingPanel created by AppDelegate.
        // Settings scene satisfies SwiftUI's requirement for at least one scene.
        Settings {
            EmptyView()
        }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var panel: FloatingPanel?
    private var statusItem: NSStatusItem?
    private var menuBarPollingTask: Task<Void, Never>?
    private let accessibility = AccessibilityManager()
    private let modifierState = ModifierState()

    func applicationDidFinishLaunching(_ notification: Notification) {
        accessibility.requestPermission()

        let rootView = KeyboardAssemblyView(
            modifierState: modifierState,
            accessibilityManager: accessibility
        )
        let hostingView = NSHostingView(rootView: rootView)
        hostingView.translatesAutoresizingMaskIntoConstraints = false

        panel = FloatingPanel(contentView: hostingView)
        panel?.orderFront(nil)

        setupMenuBar()
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

        // Poll to update accessibility status in menu
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
        panel?.orderFront(nil)
    }

    @objc private func hideKeyboard() {
        panel?.orderOut(nil)
    }

    @objc private func requestAccessibility() {
        accessibility.requestPermission()
        updateAccessibilityMenuItem()
    }
}
