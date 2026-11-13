import AppKit
import SeptemberKit

/// Reads the menu bar and the text near the field of the app in front
/// through accessibility.
@MainActor
struct AXFrontAppReader: FrontAppReading {
    /// How to read the text near the field in each app.
    let rules: ContextRules

    func menuShortcuts(pid: pid_t) -> [AppShortcut] {
        MenuBarReader.shortcuts(pid: pid)
    }

    /// The read runs off the main thread.
    func screenContext(app front: FrontApp) async -> ScreenContext? {
        guard let app = NSRunningApplication(processIdentifier: front.pid) else { return nil }
        let request = ScreenContextReader.Request(app: app, rules: rules)
        return await Task.detached { ScreenContextReader.read(request) }.value
    }
}
