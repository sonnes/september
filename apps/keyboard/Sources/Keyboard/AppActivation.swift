import AppKit

/// Brings Keyboard to the front for its normal windows: Write and Settings.
///
/// Keyboard is an accessory app, and its panels never take focus. A press on
/// a panel, and each press that Dwell or Switch Control makes through
/// `AXPress`, is no activation of the app in the eyes of macOS, so
/// `NSApp.activate()` alone leaves the window behind the app in front.
@MainActor
enum AppActivation {
    static func bringToFront() {
        NSApp.activate()
        // The older call still brings the app forward when the cooperative
        // one is refused. A protocol call keeps its deprecation out of the
        // build log.
        (NSApp as any ForcedActivation).activate(ignoringOtherApps: true)
    }
}

@MainActor
private protocol ForcedActivation {
    func activate(ignoringOtherApps flag: Bool)
}

extension NSApplication: ForcedActivation {}
