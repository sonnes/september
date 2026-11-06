import AppKit
import SeptemberKit
import SwiftUI

/// The Settings window: a normal window that takes focus, unlike the floating
/// keyboard. A second `show()` brings the same window to the front.
///
/// Keyboard is an accessory app, so `show()` activates it. When the window
/// closes, the app that was in front before gets the focus back.
@MainActor
final class SettingsWindowController: NSObject, NSWindowDelegate {
    private let pages: SettingsPages
    private var window: NSWindow?
    private var previousApp: NSRunningApplication?

    init(pages: SettingsPages) {
        self.pages = pages
    }

    func show(_ page: SettingsPage = .voice) {
        let window = self.window ?? makeWindow(page)
        self.window = window
        if !NSApp.isActive {
            previousApp = NSWorkspace.shared.frontmostApplication
        }
        AppActivation.bringToFront()
        window.makeKeyAndOrderFront(nil)
    }

    func windowWillClose(_ notification: Notification) {
        previousApp?.activate()
        previousApp = nil
    }

    private func makeWindow(_ page: SettingsPage) -> NSWindow {
        let window = NSWindow(
            contentRect: NSRect(origin: .zero, size: Metrics.Settings.windowSize),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.contentViewController = NSHostingController(
            rootView: SettingsView(pages: pages, selection: page))
        window.title = "Settings"
        window.toolbarStyle = .unified
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.setContentSize(Metrics.Settings.windowSize)
        window.center()
        window.setFrameAutosaveName("Settings")
        return window
    }
}
