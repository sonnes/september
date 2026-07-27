import AppKit
import Combine
import SeptemberKit
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var panel: FloatingPanel?
    private var statusItem: NSStatusItem?
    private var permissionSubscription: AnyCancellable?
    private let permission = AccessibilityPermission()
    private let controller = KeyboardController(sink: CGEventSink())

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Only check at launch. The prompt is shown when the user asks for it
        // from the banner or the menu, so starting September never throws a
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

        let (root, size) = makeRoot()
        let panel = FloatingPanel(root: root, contentSize: size)
        panel.positionAtBottomCenter()
        panel.orderFront(nil)
        self.panel = panel

        installStatusItem()
    }

    /// Builds the screen and measures it, scaling down if the display is too
    /// narrow for the full 1660pt layout.
    private func makeRoot() -> (AnyView, CGSize) {
        let screen = KeyboardScreen().environmentObject(controller)
        let probe = NSHostingView(rootView: screen)
        probe.layoutSubtreeIfNeeded()
        let intrinsic = probe.fittingSize

        let available = (NSScreen.main?.visibleFrame.width ?? 1440) - 48
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
        panel.update(root: root, contentSize: size)
    }

    private func installStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.image = NSImage(
            systemSymbolName: "keyboard",
            accessibilityDescription: "September"
        )

        let menu = NSMenu()
        menu.addItem(
            withTitle: "Show Keyboard",
            action: #selector(toggleKeyboard),
            keyEquivalent: ""
        ).target = self
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
            withTitle: "Quit September",
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
            panel.positionAtBottomCenter()
            panel.orderFront(nil)
            sender.title = "Hide Keyboard"
        }
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
