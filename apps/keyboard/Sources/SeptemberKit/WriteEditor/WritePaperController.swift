import AppKit

/// The Write paper: a sheet with the native editor and no window frame.
///
/// The paper grows out of the input bar of the keyboard when it opens. Its
/// width is the width of the largest A4 page above the keyboard. Its height
/// is the height of its text, so the paper grows up a line at a time as the
/// user types, as paper comes out of a typewriter. At the top of the page,
/// the paper stops, and the text moves up so that the typing line stays at
/// the bottom. With Reduce Motion on, the paper and the text move with no
/// animation.
@MainActor
public final class WritePaperController: NSObject, NSWindowDelegate {
    typealias Motion = Metrics.WriteMotion

    public let window: WritePaperWindow
    public let editor: WriteTextView
    private let scrollView = NSScrollView()
    /// The frame of the full page. The paper grows up to it.
    private var page: CGRect = .zero
    private var pendingFit = false
    private let frameMotion = WriteMotionDriver()
    private let scrollMotion = WriteMotionDriver()
    /// The frame that the paper moves to.
    private var targetFrame: CGRect?

    /// Called with `true` when the paper becomes the key window, and with
    /// `false` when it stops being the key window.
    public var onKeyChanged: ((Bool) -> Void)?
    /// Called when the paper closes.
    public var onClose: (() -> Void)?
    /// Brings the paper to the front with the focus. The keyboard passes
    /// `AppActivation.bringToFront`, which handles a press through `AXPress`.
    public var bringToFront: (NSWindow) -> Void = { window in
        NSApp.activate()
        window.makeKeyAndOrderFront(nil)
    }
    /// Called when the paper closes, so that it does not wait for the focus.
    public var windowClosed: (NSWindow) -> Void = { _ in }

    override public init() {
        window = WritePaperWindow(contentRect: .zero, styleMask: [.borderless], backing: .buffered, defer: true)
        editor = WriteTextView(frame: NSRect(x: 0, y: 0, width: 600, height: 400))
        super.init()

        window.isReleasedWhenClosed = false
        window.hasShadow = true
        window.isOpaque = true
        window.backgroundColor = NSColor(Tokens.writePaper)
        window.delegate = self

        scrollView.drawsBackground = false
        scrollView.borderType = .noBorder
        scrollView.hasVerticalScroller = true
        scrollView.autohidesScrollers = true
        scrollView.scrollerStyle = .overlay
        scrollView.documentView = editor
        window.contentView = scrollView

        editor.paperScrolls = true
        editor.minSize = .zero
        editor.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude, height: .greatestFiniteMagnitude)
        editor.onLayoutChange = { [weak self] in self?.scheduleFit() }
    }

    public var isOpen: Bool { window.isVisible }

    private var reduceMotion: Bool { NSWorkspace.shared.accessibilityDisplayShouldReduceMotion }

    /// Opens the paper, or brings it to the front.
    ///
    /// - Parameters:
    ///   - bar: the frame of the input bar on the screen. If it is nil, the
    ///     paper opens with no animation.
    ///   - floor: the top of the keyboard window. The paper opens above it.
    ///   - screen: the visible frame of the screen.
    ///   - margin: the space between the paper and the edges of the screen.
    public func show(from bar: CGRect?, floor: CGFloat, screen: CGRect, margin: CGFloat) {
        page = WritePaper.page(
            bar: bar ?? CGRect(x: screen.midX, y: floor, width: 0, height: 0), floor: floor, screen: screen,
            margin: margin)
        setWidth(page.width)
        let frame = paperFrame
        let animates = bar != nil && !reduceMotion && !window.isVisible
        if let bar, animates {
            window.alphaValue = 0
            window.setFrame(bar, display: false)
        } else {
            window.alphaValue = 1
            window.setFrame(frame, display: false)
        }
        bringToFront(window)
        window.makeFirstResponder(editor)
        scrollToCaret(animated: false)
        guard animates else {
            targetFrame = frame
            return
        }
        // The keyboard floats above the paper, so the paper comes out from
        // behind the bar.
        move(to: frame, duration: Motion.paperOpen, fadeIn: true)
    }

    /// Moves the paper to `frame`, from where it is now.
    private func move(to frame: CGRect, duration: TimeInterval, fadeIn: Bool = false) {
        targetFrame = frame
        let from = window.frame
        let alpha = window.alphaValue
        frameMotion.run(duration: duration, curve: .easeOut) { [weak self] progress in
            guard let self else { return }
            window.setFrame(from.interpolated(to: frame, progress), display: true)
            if fadeIn { window.alphaValue = alpha + (1 - alpha) * CGFloat(progress) }
        }
    }

    public func close() {
        window.close()
    }

    // MARK: - Size

    /// The paper as tall as its text, on the page.
    private var paperFrame: CGRect {
        WritePaper.paper(height: editor.contentHeight, on: page)
    }

    /// Sets the width of the paper and centres the text column on it.
    private func setWidth(_ width: CGFloat) {
        let side = max(Metrics.WriteEditor.sideMargin, (width - Metrics.WriteEditor.textWidth) / 2)
        editor.textContainerInset = NSSize(width: side, height: Metrics.WriteEditor.paperMargin)
        editor.setFrameSize(NSSize(width: width, height: editor.frame.height))
        scrollView.setFrameSize(NSSize(width: width, height: scrollView.frame.height))
    }

    /// Fits the paper to the text once per turn of the run loop, after the
    /// edits of one key press are done.
    private func scheduleFit() {
        guard window.isVisible, !pendingFit else { return }
        pendingFit = true
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            pendingFit = false
            fit()
        }
    }

    /// Grows or shrinks the paper to its text, then keeps the caret line in
    /// view.
    private func fit() {
        let frame = paperFrame
        if targetFrame != frame {
            if reduceMotion {
                targetFrame = frame
                window.setFrame(frame, display: true)
            } else {
                move(to: frame, duration: Motion.paperFeed, fadeIn: window.alphaValue < 1)
            }
        }
        scrollToCaret(animated: !reduceMotion, visibleHeight: frame.height)
    }

    /// On a full page, moves the text so that the caret line stays in view,
    /// at the bottom of the paper when the user types at the end.
    private func scrollToCaret(animated: Bool, visibleHeight: CGFloat? = nil) {
        let clip = scrollView.contentView
        let height = visibleHeight ?? clip.bounds.height
        let content = editor.contentHeight
        guard let caret = editor.caretFrame() else { return }
        let target = WritePaper.scrollOrigin(
            caretMaxY: caret.maxY, current: clip.bounds.origin.y, visibleHeight: height, contentHeight: content,
            margin: Metrics.WriteEditor.paperMargin, caretHeight: caret.height)
        guard abs(target - clip.bounds.origin.y) > 0.5 else { return }
        let start = clip.bounds.origin.y
        let apply = { [weak self] (y: CGFloat) in
            guard let self else { return }
            clip.setBoundsOrigin(NSPoint(x: 0, y: y))
            scrollView.reflectScrolledClipView(clip)
        }
        guard animated else {
            scrollMotion.stop()
            apply(target)
            return
        }
        scrollMotion.run(duration: Motion.paperFeed, curve: .easeOut) { progress in
            apply(start + (target - start) * CGFloat(progress))
        }
    }

    // MARK: - NSWindowDelegate

    public func windowDidBecomeKey(_ notification: Notification) {
        editor.overlay.update()
        onKeyChanged?(true)
    }

    public func windowDidResignKey(_ notification: Notification) {
        editor.overlay.update()
        onKeyChanged?(false)
    }

    public func windowWillClose(_ notification: Notification) {
        frameMotion.stop()
        scrollMotion.stop()
        targetFrame = nil
        windowClosed(window)
        onClose?()
    }
}

/// The window of the paper. It has no frame, so it says that it can become
/// the key window. The app has no menu bar of its own, so the window answers
/// Command-N and Command-W itself.
public final class WritePaperWindow: NSWindow {
    public var onNewDocument: (() -> Void)?

    override public var canBecomeKey: Bool { true }
    override public var canBecomeMain: Bool { true }

    override public func performKeyEquivalent(with event: NSEvent) -> Bool {
        let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
        guard flags == .command else { return super.performKeyEquivalent(with: event) }
        switch event.charactersIgnoringModifiers {
        case "n":
            onNewDocument?()
            return true
        case "w":
            close()
            return true
        default:
            return super.performKeyEquivalent(with: event)
        }
    }
}
