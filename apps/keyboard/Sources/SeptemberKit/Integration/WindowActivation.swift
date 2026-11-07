import Foundation

/// The app, as `WindowActivation` uses it. `NSApplication` is one.
@MainActor
public protocol ActivatingApp: AnyObject {
    var isActive: Bool { get }
    /// Asks macOS to activate the app. macOS can refuse.
    func activate()
}

/// A window that takes the focus, as `WindowActivation` uses it. `NSWindow`
/// is one.
@MainActor
public protocol FocusWindow: AnyObject {
    /// Shows the window on top of the windows of other apps, with no focus.
    func orderFrontRegardless()
    func makeKeyAndOrderFront(_ sender: Any?)
}

/// Brings the Write window or the Settings window to the front with the
/// focus.
///
/// Since macOS 14, activation is cooperative: macOS activates an app only
/// when the request comes from user input to that app, or when the active
/// app yields. A press through `AXPress` (Dwell, Switch Control, Voice
/// Control) is no input to the keyboard, so macOS refuses the request, and
/// the app in front keeps the focus.
///
/// `bringToFront(_:)` asks for activation each time. If the app is not
/// active after the request, the window shows on top with
/// `orderFrontRegardless()`, and it waits. When the app becomes active, for
/// example after a click on the window, the waiting window takes the focus.
/// If another window of the app took the focus first, that window keeps it.
@MainActor
public final class WindowActivation {
    private let app: any ActivatingApp
    private weak var waiting: (any FocusWindow)?

    public init(app: any ActivatingApp) {
        self.app = app
    }

    public func bringToFront(_ window: any FocusWindow) {
        app.activate()
        if app.isActive {
            waiting = nil
            window.makeKeyAndOrderFront(nil)
        } else {
            window.orderFrontRegardless()
            waiting = window
        }
    }

    /// Call it when the app becomes active, with the key window of the app.
    public func appBecameActive(keyWindow: (any FocusWindow)?) {
        guard let window = waiting else { return }
        waiting = nil
        if keyWindow == nil || keyWindow === window {
            window.makeKeyAndOrderFront(nil)
        }
    }

    /// Call it when a window closes, so that it does not take the focus.
    public func windowClosed(_ window: any FocusWindow) {
        if waiting === window { waiting = nil }
    }
}
