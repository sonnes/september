import AppKit
import SwiftUI

final class FloatingPanel: NSPanel {
    private static let frameKey = "FloatingPanelFrame"

    init(contentView: NSView) {
        super.init(
            contentRect: .zero,
            styleMask: [.nonactivatingPanel, .resizable],
            backing: .buffered,
            defer: false
        )

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
        let width = max(size.width, 850)
        let height = max(size.height, 320)
        setContentSize(NSSize(width: width, height: height))

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

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(savePosition),
            name: NSWindow.didMoveNotification,
            object: self
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(savePosition),
            name: NSWindow.didResizeNotification,
            object: self
        )
    }

    @objc private func savePosition() {
        UserDefaults.standard.set(NSStringFromRect(frame), forKey: Self.frameKey)
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}
