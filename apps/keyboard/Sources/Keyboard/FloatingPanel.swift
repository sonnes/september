import AppKit
import SwiftUI

/// A panel that floats above every app and never takes focus, so the app the
/// user is typing into keeps its caret and stays frontmost.
final class FloatingPanel: NSPanel {
    /// Where on the screen the panel sits.
    enum Placement {
        /// At the bottom right of the visible frame, inside the margin.
        case bottomRight
        /// Where the app or the user put it. A new size keeps the bottom left
        /// corner.
        case free
    }

    private let placement: Placement

    private let hosting: NSHostingView<AnyView>
    /// Distance from the screen's visible edges, the same on every side.
    static let margin: CGFloat = 24

    init(root: AnyView, contentSize: CGSize, placement: Placement) {
        hosting = NSHostingView(rootView: root)
        self.placement = placement
        super.init(
            contentRect: NSRect(origin: .zero, size: contentSize),
            // No title bar: a title bar gives the hosting view a safe area, and
            // SwiftUI then moves the content up and down by half its height.
            styleMask: [.nonactivatingPanel, .borderless],
            backing: .buffered,
            defer: false
        )

        isFloatingPanel = true
        becomesKeyOnlyIfNeeded = true
        hidesOnDeactivate = false
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]

        // A window moves only by its grip, so a press on a key never moves it.
        isMovableByWindowBackground = false
        backgroundColor = .clear
        isOpaque = false
        hasShadow = true

        contentView = hosting
        setContentSize(contentSize)
        position()
    }

    /// Clicking a key must never pull focus away from the app being typed into.
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }

    /// Swaps the content when the layout changes size — the permission banner
    /// appearing, for instance.
    func update(root: AnyView, contentSize: CGSize) {
        hosting.rootView = root
        setContentSize(contentSize)
        position()
    }

    /// The screen that holds the pointer: the one the user looks at.
    static var activeScreen: NSScreen? {
        NSScreen.screens.first(where: { $0.frame.contains(NSEvent.mouseLocation) }) ?? NSScreen.main
    }

    /// Moves a bottom-right panel to the bottom right of the screen that
    /// holds the pointer.
    private func position() {
        guard let screen = FloatingPanel.activeScreen else { return }
        let visible = screen.visibleFrame

        guard case .bottomRight = placement else { return }
        setFrameOrigin(
            NSPoint(
                x: visible.maxX - frame.width - FloatingPanel.margin,
                y: visible.minY + FloatingPanel.margin))
    }
}
