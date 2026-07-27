import AppKit
import SwiftUI

/// A panel that floats above every app and never takes focus, so the app the
/// user is typing into keeps its caret and stays frontmost.
final class FloatingPanel: NSPanel {
    private let hosting: NSHostingView<AnyView>

    init(root: AnyView, contentSize: CGSize) {
        hosting = NSHostingView(rootView: root)
        super.init(
            contentRect: NSRect(origin: .zero, size: contentSize),
            styleMask: [.nonactivatingPanel, .titled, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        isFloatingPanel = true
        becomesKeyOnlyIfNeeded = true
        hidesOnDeactivate = false
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]

        titleVisibility = .hidden
        titlebarAppearsTransparent = true
        isMovableByWindowBackground = true
        backgroundColor = .clear
        isOpaque = false
        hasShadow = true
        for button in [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton] {
            standardWindowButton(button)?.isHidden = true
        }

        contentView = hosting
        setContentSize(contentSize)
    }

    /// Clicking a key must never pull focus away from the app being typed into.
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }

    /// Swaps the content when the layout changes size — the permission banner
    /// appearing, for instance.
    func update(root: AnyView, contentSize: CGSize) {
        hosting.rootView = root
        setContentSize(contentSize)
        positionAtBottomCenter()
    }

    /// Sit centred just above the bottom edge of the screen holding the pointer.
    func positionAtBottomCenter() {
        guard
            let screen = NSScreen.screens.first(where: { $0.frame.contains(NSEvent.mouseLocation) })
                ?? NSScreen.main
        else { return }
        let visible = screen.visibleFrame
        setFrameOrigin(
            NSPoint(x: visible.midX - frame.width / 2, y: visible.minY + 24)
        )
    }
}
