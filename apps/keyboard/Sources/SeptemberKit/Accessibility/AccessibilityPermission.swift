import AppKit
import ApplicationServices
import Combine

/// Whether macOS trusts the app for Accessibility. The user grants it in
/// System Settings while Keyboard runs, and macOS 15 and later re-asks from
/// time to time, so this polls.
@MainActor
public final class AccessibilityPermission: ObservableObject {
    @Published public private(set) var isTrusted: Bool

    private var timer: Timer?

    public init(isTrusted: Bool = AXIsProcessTrusted()) {
        self.isTrusted = isTrusted
    }

    public func startMonitoring() {
        refresh()
        timer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.refresh() }
        }
    }

    private func refresh() {
        let trusted = AXIsProcessTrusted()
        if trusted != isTrusted { isTrusted = trusted }
    }

    /// Shows the system prompt, which macOS shows only once, then opens the
    /// Accessibility pane of System Settings.
    public func openSettings() {
        // kAXTrustedCheckOptionPrompt is an imported `var`, which Swift 6 does
        // not let us touch across isolation. Its value is a stable constant.
        let options = ["AXTrustedCheckOptionPrompt": true] as CFDictionary
        _ = AXIsProcessTrustedWithOptions(options)
        guard
            let url = URL(
                string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
            )
        else { return }
        NSWorkspace.shared.open(url)
    }
}
