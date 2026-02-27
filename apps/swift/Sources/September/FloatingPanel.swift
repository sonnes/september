import AppKit
import SwiftUI

final class FloatingPanel: NSPanel {
    init(contentView: NSView) {
        super.init(
            contentRect: .zero,
            styleMask: [.nonactivatingPanel, .titled, .closable, .resizable],
            backing: .buffered,
            defer: false
        )

        self.contentView = contentView
        self.title = "September"
        self.level = .floating
        self.isFloatingPanel = true
        self.hidesOnDeactivate = false
        self.isReleasedWhenClosed = false
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        self.isMovableByWindowBackground = true
        self.titlebarAppearsTransparent = true
        self.titleVisibility = .hidden

        let size = contentView.fittingSize
        let width = max(size.width, 720)
        let height = max(size.height, 280)
        setContentSize(NSSize(width: width, height: height))
        center()
    }

    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}
