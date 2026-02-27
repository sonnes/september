import AppKit
import SwiftUI

final class FloatingPanel: NSPanel {
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
        center()
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}
