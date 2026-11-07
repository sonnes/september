import AppKit
import SeptemberKit

/// Brings Keyboard to the front for its normal windows: Write and Settings.
///
/// Keyboard is an accessory app, and its panels never take focus. Since
/// macOS 14, activation is cooperative, and macOS refuses `NSApp.activate()`
/// after a press through `AXPress`, because the press is no input to the
/// keyboard. The window then shows on top of the app in front with
/// `orderFrontRegardless()`, and it takes the focus when the app becomes
/// active, for example after a click on the window. `WindowActivation`
/// holds the rule.
@MainActor
enum AppActivation {
    private static let activation = WindowActivation(app: NSApp)

    static func bringToFront(_ window: NSWindow) {
        activation.bringToFront(window)
    }

    /// Call it from `applicationDidBecomeActive(_:)`.
    static func appBecameActive() {
        activation.appBecameActive(keyWindow: NSApp.keyWindow)
    }

    static func windowClosed(_ window: NSWindow) {
        activation.windowClosed(window)
    }
}

extension NSApplication: ActivatingApp {}
extension NSWindow: FocusWindow {}
