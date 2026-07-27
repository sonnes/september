import AppKit
import ApplicationServices
import Combine

/// Tracks whether the app is trusted for Accessibility. macOS re-asks
/// periodically (15+), and the user grants it in System Settings while we keep
/// running, so this polls rather than checking once at launch.
@MainActor
final class AccessibilityPermission: ObservableObject {
    @Published private(set) var isTrusted: Bool = AXIsProcessTrusted()

    private var timer: Timer?

    func startMonitoring() {
        refresh()
        timer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.refresh() }
        }
    }

    func refresh() {
        let trusted = AXIsProcessTrusted()
        if trusted != isTrusted { isTrusted = trusted }
    }

    /// Shows the system prompt the first time; afterwards it is a no-op, which
    /// is why `openSettings()` exists alongside it.
    func request() {
        // kAXTrustedCheckOptionPrompt is an imported `var`, which Swift 6 will
        // not let us touch across isolation; its value is a stable constant.
        let options = ["AXTrustedCheckOptionPrompt": true] as CFDictionary
        _ = AXIsProcessTrustedWithOptions(options)
    }

    func openSettings() {
        guard
            let url = URL(
                string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
            )
        else { return }
        NSWorkspace.shared.open(url)
    }
}
