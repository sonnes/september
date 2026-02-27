import AppKit

@MainActor
@Observable
final class AccessibilityManager {
    var isGranted = false
    private var pollTimer: Timer?

    func checkPermission() {
        isGranted = AXIsProcessTrusted()
    }

    func requestPermission() {
        let options = [
            "AXTrustedCheckOptionPrompt": true
        ] as CFDictionary
        isGranted = AXIsProcessTrustedWithOptions(options)

        if !isGranted {
            startPolling()
        }
    }

    private func startPolling() {
        pollTimer?.invalidate()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.isGranted = AXIsProcessTrusted()
                if self.isGranted {
                    self.pollTimer?.invalidate()
                    self.pollTimer = nil
                }
            }
        }
    }
}
