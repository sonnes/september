import AppKit

/// The Write paper: a sheet with the native editor, round corners, and no
/// window frame.
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
    /// The tools rail at the left of the paper.
    public let tools = WriteToolsController()
    private let scrollView = NSScrollView()
    private let notice = NSTextField(labelWithString: "")
    /// The frame of the full page. The paper grows up to it.
    private var page: CGRect = .zero
    private let frameMotion = WriteMotionDriver()
    private let scrollMotion = WriteMotionDriver()
    private var targetFrame: CGRect?

    public var onClose: (() -> Void)?
    private weak var host: (any WriteHost)?

    public init(host: any WriteHost) {
        self.host = host
        window = WritePaperWindow(contentRect: .zero, styleMask: [.borderless], backing: .buffered, defer: true)
        editor = WriteTextView(frame: NSRect(x: 0, y: 0, width: 600, height: 400))
        super.init()

        window.isReleasedWhenClosed = false
        window.hasShadow = true
        // The window is clear, so that the sheet can have round corners.
        window.isOpaque = false
        window.backgroundColor = .clear
        window.delegate = self

        let sheet = PaperSheetView()
        scrollView.drawsBackground = false
        scrollView.borderType = .noBorder
        scrollView.hasVerticalScroller = true
        scrollView.autohidesScrollers = true
        scrollView.scrollerStyle = .overlay
        scrollView.documentView = editor
        scrollView.autoresizingMask = [.width, .height]
        sheet.addSubview(scrollView)

        notice.font = Typography.writeNotice
        notice.textColor = NSColor(Tokens.labelSecondary)
        notice.isHidden = true
        notice.translatesAutoresizingMaskIntoConstraints = false
        sheet.addSubview(notice)
        let padding = Metrics.WriteEditor.noticePadding
        NSLayoutConstraint.activate([
            notice.topAnchor.constraint(equalTo: sheet.topAnchor, constant: padding),
            notice.trailingAnchor.constraint(equalTo: sheet.trailingAnchor, constant: -padding),
            notice.leadingAnchor.constraint(greaterThanOrEqualTo: sheet.leadingAnchor, constant: padding),
        ])
        window.contentView = sheet

        editor.paperScrolls = true
        // The paper sets the width of the text itself, so that the text does
        // not wrap again while the paper opens.
        editor.autoresizingMask = []
        editor.minSize = .zero
        editor.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude, height: .greatestFiniteMagnitude)
        editor.onLayoutChange = { [weak self] in self?.fit() }
    }

    public var isOpen: Bool { window.isVisible }

    /// Shows a short notice at the top of the paper, such as a save error.
    /// Nil hides it.
    public func showNotice(_ text: String?) {
        notice.stringValue = text ?? ""
        notice.isHidden = text == nil
    }

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
            margin: margin, leading: tools.leading)
        present(from: bar)
    }

    /// Opens the paper again on the same page. It grows out of `start`, such
    /// as the card of the document on the desk. If `start` is nil, the paper
    /// opens with no animation.
    public func reopen(from start: CGRect?) {
        present(from: start)
    }

    /// Shrinks the paper into `card` and fades it out, as the desk opens. If
    /// `card` is nil, the paper goes with no animation. The paper does not
    /// close, so the open document stays in the editor.
    public func shrink(into card: CGRect?) {
        guard window.isVisible else { return }
        scrollMotion.stop()
        targetFrame = nil
        tools.hide()
        guard let card, !reduceMotion else {
            frameMotion.stop()
            window.orderOut(nil)
            return
        }
        let from = window.frame
        frameMotion.run(duration: Motion.deskCards, curve: .easeOut) { [weak self] progress in
            guard let self else { return }
            window.setFrame(from.interpolated(to: card, progress), display: true)
            window.alphaValue = 1 - CGFloat(progress)
            if progress >= 1 {
                window.orderOut(nil)
                window.alphaValue = 1
            }
        }
    }

    private func present(from start: CGRect?) {
        setWidth(page.width)
        let frame = paperFrame
        let animates = start != nil && !reduceMotion && (!window.isVisible || window.alphaValue < 1)
        if let start, animates {
            window.alphaValue = 0
            window.setFrame(start, display: false)
        } else {
            window.alphaValue = 1
            window.setFrame(frame, display: false)
            window.invalidateShadow()
        }
        host?.bringToFront(window)
        window.makeFirstResponder(editor)
        scrollToCaret(animated: false)
        guard animates else {
            frameMotion.stop()
            targetFrame = frame
            showTools()
            return
        }
        // The keyboard floats above the paper, so the paper comes out from
        // behind the bar.
        move(to: frame, duration: Motion.paperOpen, fadeIn: true)
    }

    private func move(to frame: CGRect, duration: TimeInterval, fadeIn: Bool = false) {
        targetFrame = frame
        let from = window.frame
        let alpha = window.alphaValue
        frameMotion.run(duration: duration, curve: .easeOut) { [weak self] progress in
            guard let self else { return }
            window.setFrame(from.interpolated(to: frame, progress), display: true)
            if fadeIn { window.alphaValue = alpha + (1 - alpha) * CGFloat(progress) }
            // The shadow of a clear window follows its shape only after a redraw.
            if progress >= 1 {
                window.invalidateShadow()
                showTools()
            }
        }
    }

    public func close() {
        window.close()
    }

    /// Shows the tools rail at the bottom left of the page. The bottom of
    /// the paper does not move after it opens, so the rail stays in place.
    private func showTools() {
        guard window.isVisible else { return }
        tools.show(beside: window, frame: paperFrame)
    }

    // MARK: - Size

    private var paperFrame: CGRect {
        WritePaper.paper(height: editor.contentHeight, on: page)
    }

    private func setWidth(_ width: CGFloat) {
        Self.configure(editor, width: width)
    }

    /// Sets the width of `editor` and centres the text column on it, with
    /// the margins of the paper.
    private static func configure(_ editor: WriteTextView, width: CGFloat) {
        let side = max(Metrics.WriteEditor.sideMargin, (width - Metrics.WriteEditor.textWidth) / 2)
        editor.textContainerInset = NSSize(width: side, height: Metrics.WriteEditor.paperMargin)
        editor.setFrameSize(NSSize(width: width, height: editor.frame.height))
    }

    /// Draws the sheet of the paper with `markdown` in the editor, at `width`
    /// and as tall as its text, with no window on the screen. The snapshots
    /// and Write Lab use it. With no `appearance`, the sheet takes the
    /// appearance of the app.
    public static func renderSheet(
        _ markdown: String, width: CGFloat, appearance: NSAppearance? = nil
    ) -> NSBitmapImageRep? {
        let editor = WriteTextView(frame: NSRect(x: 0, y: 0, width: width, height: 400))
        configure(editor, width: width)
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: width, height: 400), styleMask: [.borderless],
            backing: .buffered, defer: false)
        window.appearance = appearance
        let content = NSView(frame: window.contentLayoutRect)
        window.contentView = content
        content.addSubview(editor)
        editor.load(markdown)
        let height = editor.contentHeight
        window.setContentSize(NSSize(width: width, height: height))
        content.frame = NSRect(x: 0, y: 0, width: width, height: height)
        editor.frame = content.bounds
        content.layoutSubtreeIfNeeded()
        editor.display()

        guard let rep = content.bitmapImageRepForCachingDisplay(in: content.bounds) else { return nil }
        let draw = {
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
            NSColor(Tokens.key).setFill()
            content.bounds.fill()
            NSGraphicsContext.restoreGraphicsState()
            content.cacheDisplay(in: content.bounds, to: rep)
        }
        if let appearance { appearance.performAsCurrentDrawingAppearance(draw) } else { draw() }
        return rep
    }

    /// Grows or shrinks the open paper to its text, then keeps the caret line
    /// in view.
    private func fit() {
        guard window.isVisible else { return }
        let frame = paperFrame
        if targetFrame != frame {
            if reduceMotion {
                targetFrame = frame
                window.setFrame(frame, display: true)
                window.invalidateShadow()
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
        host?.writeKeyChanged(true)
    }

    public func windowDidResignKey(_ notification: Notification) {
        editor.overlay.update()
        host?.writeKeyChanged(false)
    }

    public func windowWillClose(_ notification: Notification) {
        frameMotion.stop()
        scrollMotion.stop()
        targetFrame = nil
        tools.hide()
        host?.windowClosed(window)
        onClose?()
    }
}

/// The sheet of the paper: the paper colour with round corners.
private final class PaperSheetView: NSView {
    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layer?.cornerRadius = Metrics.WriteEditor.paperCornerRadius
        layer?.cornerCurve = .continuous
        layer?.masksToBounds = true
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override var wantsUpdateLayer: Bool { true }

    /// AppKit calls this again when the appearance changes, so the colour
    /// follows light and dark.
    override func updateLayer() {
        layer?.backgroundColor = NSColor(Tokens.key).cgColor
    }
}

/// The window of the paper. It has no frame, so it says that it can become
/// the key window. The app has no menu bar of its own, so the window answers
/// Command-N, Command-O, and Command-W itself.
public final class WritePaperWindow: NSWindow {
    public var onNewDocument: (() -> Void)?
    /// Command-O: the desk of documents.
    public var onShowDocuments: (() -> Void)?

    override public var canBecomeKey: Bool { true }
    override public var canBecomeMain: Bool { true }

    override public func performKeyEquivalent(with event: NSEvent) -> Bool {
        let flags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
        guard flags == .command else { return super.performKeyEquivalent(with: event) }
        switch event.charactersIgnoringModifiers {
        case "n":
            onNewDocument?()
            return true
        case "o":
            onShowDocuments?()
            return true
        case "w":
            close()
            return true
        default:
            return super.performKeyEquivalent(with: event)
        }
    }
}
