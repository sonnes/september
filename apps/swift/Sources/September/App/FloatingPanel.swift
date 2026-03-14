import AppKit
import SwiftUI

// MARK: - FloatingPanel
//
// NSPanel subclass for non-activating floating windows.
// Stays on top of all apps without stealing focus — essential for
// assistive keyboard overlay.

final class FloatingPanel: NSPanel {
    private static let frameKey = "FloatingPanelFrame"

    init(contentView: NSView, minWidth: CGFloat = 1600, minHeight: CGFloat = 450, frameKey: String? = nil) {
        super.init(
            contentRect: .zero,
            styleMask: [.nonactivatingPanel, .resizable],
            backing: .buffered,
            defer: false
        )

        let savedFrameKey = frameKey ?? Self.frameKey

        self.contentView = contentView
        self.level = .floating
        self.isFloatingPanel = true
        self.hidesOnDeactivate = false
        self.isReleasedWhenClosed = false
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        self.isMovableByWindowBackground = true
        self.isOpaque = false
        self.backgroundColor = .clear
        contentView.wantsLayer = true
        contentView.layer?.cornerRadius = 10
        contentView.layer?.masksToBounds = true

        let size = contentView.fittingSize
        let width = max(size.width, minWidth)
        let height = max(size.height, minHeight)
        setContentSize(NSSize(width: width, height: height))

        restorePosition(key: savedFrameKey)

        NotificationCenter.default.addObserver(
            forName: NSWindow.didMoveNotification, object: self, queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            UserDefaults.standard.set(NSStringFromRect(self.frame), forKey: savedFrameKey)
        }

        NotificationCenter.default.addObserver(
            forName: NSWindow.didResizeNotification, object: self, queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            UserDefaults.standard.set(NSStringFromRect(self.frame), forKey: savedFrameKey)
        }
    }

    private func restorePosition(key: String) {
        if let savedFrame = UserDefaults.standard.string(forKey: key) {
            let frame = NSRectFromString(savedFrame)
            if NSScreen.screens.contains(where: { $0.visibleFrame.intersects(frame) }) {
                setFrame(frame, display: true)
            } else {
                center()
            }
        } else {
            center()
        }
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}
