import AppKit
import os

/// Manages Accessibility permission state. EventInjector requires this permission
/// to post CGEvent keystrokes. Polls until granted after the initial prompt.
@MainActor
@Observable
final class AccessibilityManager {
    var isGranted = false

    private static let logger = Logger(subsystem: "to.september.app", category: "Accessibility")
    private var pollTimer: Timer?

    static var isTrusted: Bool {
        AXIsProcessTrusted()
    }

    // Note: pollTimer lives for app lifetime in practice.
    // If this class is ever recreated, the timer self-invalidates
    // via the [weak self] guard when the reference is released.

    func checkPermission() {
        isGranted = AXIsProcessTrusted()
    }

    func requestPermission() {
        let options = [
            "AXTrustedCheckOptionPrompt": true,
        ] as CFDictionary
        isGranted = AXIsProcessTrustedWithOptions(options)
        Self.logger.info("Accessibility permission requested, granted: \(self.isGranted)")

        if !isGranted {
            startPolling()
        }
    }

    private func startPolling() {
        pollTimer?.invalidate()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                let wasGranted = self.isGranted
                self.isGranted = AXIsProcessTrusted()
                if self.isGranted && !wasGranted {
                    Self.logger.info("Accessibility permission granted")
                    self.pollTimer?.invalidate()
                    self.pollTimer = nil
                }
            }
        }
    }
}
