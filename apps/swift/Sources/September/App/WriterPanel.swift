import AppKit
import SwiftUI

// MARK: - WriterPanel
//
// Activating NSPanel for the floating writer. Unlike FloatingPanel (keyboard),
// this panel CAN become key and main — the user types directly into it.
//
// Layout from design:
//   - Dim overlay: full screen, #00000033
//   - Writer panel: 720×640, corner radius 10
//   - Shadow: blur 48, y 12, spread 2, #00000018

final class WriterPanel: NSPanel {
    private static let frameKey = "WriterPanelFrame"

    init(contentView: NSView) {
        super.init(
            contentRect: NSRect(x: 0, y: 0, width: 720, height: 640),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )

        self.contentView = contentView
        self.title = "September Writer"
        self.titleVisibility = .hidden
        self.titlebarAppearsTransparent = true
        self.isReleasedWhenClosed = false
        self.level = .floating
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        self.isMovableByWindowBackground = true
        self.minSize = NSSize(width: 480, height: 400)

        // Shadow matching design spec
        self.hasShadow = true

        contentView.wantsLayer = true
        contentView.layer?.cornerRadius = 10
        contentView.layer?.masksToBounds = true

        restorePosition()

        NotificationCenter.default.addObserver(
            forName: NSWindow.didMoveNotification, object: self, queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            UserDefaults.standard.set(NSStringFromRect(self.frame), forKey: Self.frameKey)
        }

        NotificationCenter.default.addObserver(
            forName: NSWindow.didResizeNotification, object: self, queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            UserDefaults.standard.set(NSStringFromRect(self.frame), forKey: Self.frameKey)
        }
    }

    private func restorePosition() {
        if let savedFrame = UserDefaults.standard.string(forKey: Self.frameKey) {
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

    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
}

// MARK: - DimOverlayWindow
//
// Full-screen dim overlay behind the writer panel (#00000033).

final class DimOverlayWindow: NSWindow {
    init() {
        super.init(
            contentRect: .zero,
            styleMask: .borderless,
            backing: .buffered,
            defer: false
        )

        self.isOpaque = false
        self.backgroundColor = NSColor.black.withAlphaComponent(0.2)
        self.level = .floating - 1  // Just below the writer panel
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        self.ignoresMouseEvents = true
        self.isReleasedWhenClosed = false
        self.hasShadow = false

        // Cover the main screen
        if let screen = NSScreen.main {
            setFrame(screen.frame, display: true)
        }
    }
}
