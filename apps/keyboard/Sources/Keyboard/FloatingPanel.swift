import AppKit
import SwiftUI

/// A panel that floats above every app and never takes focus, so the app the
/// user is typing into keeps its caret and stays frontmost.
final class FloatingPanel: NSPanel {
    /// Where on the screen the panel sits. Both placements share the same
    /// bottom edge, so the keyboard and the tree viewer line up.
    enum Placement {
        /// Centred in the space left over once `rightInset` is reserved.
        case bottomCenter(rightInset: CGFloat)
        case bottomRight
        /// Where the app or the user put it. A new size keeps the bottom left
        /// corner.
        case free
    }

    var placement: Placement = .bottomCenter(rightInset: 0) {
        didSet { position() }
    }

    private let hosting: NSHostingView<AnyView>
    /// Distance from the screen's visible edges, the same on every side.
    static let margin: CGFloat = 24

    init(root: AnyView, contentSize: CGSize) {
        hosting = NSHostingView(rootView: root)
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

        isMovableByWindowBackground = true
        backgroundColor = .clear
        isOpaque = false
        hasShadow = true

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
        position()
    }

    /// The screen that holds the pointer: the one the user looks at.
    static var activeScreen: NSScreen? {
        NSScreen.screens.first(where: { $0.frame.contains(NSEvent.mouseLocation) }) ?? NSScreen.main
    }

    /// Sit just above the bottom edge of the screen holding the pointer.
    func position() {
        guard let screen = FloatingPanel.activeScreen else { return }
        let visible = screen.visibleFrame

        let x: CGFloat
        switch placement {
        case .bottomCenter(let rightInset):
            x = (visible.minX + visible.maxX - rightInset) / 2 - frame.width / 2
        case .bottomRight:
            x = visible.maxX - frame.width - FloatingPanel.margin
        case .free:
            return
        }
        setFrameOrigin(NSPoint(x: x, y: visible.minY + FloatingPanel.margin))
    }
}
