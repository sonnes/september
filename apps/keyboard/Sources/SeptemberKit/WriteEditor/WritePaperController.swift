import AppKit
import WebKit

/// The Write paper: a sheet with the Markdown editor, round corners, and no
/// window frame.
///
/// The paper grows out of the input bar of the keyboard when it opens. Its
/// width is the width of the largest A4 page above the keyboard. Its height
/// is the height of its text, so the paper grows up a line at a time as the
/// user types, as paper comes out of a typewriter. At the top of the page,
/// the paper stops, and the editor scrolls its text. With Reduce Motion on,
/// the paper moves with no animation.
///
/// The editor page is as large as the full page, and its top stays on the
/// top of the paper. The paper shows the top part of the page, so the text
/// does not wrap again while the paper opens or grows.
@MainActor
public final class WritePaperController: NSObject, NSWindowDelegate {
    typealias Motion = Metrics.WriteMotion

    public let window: WritePaperWindow
    public let editor: WriteWebEditor
    /// The tools rail at the left of the paper.
    public let tools = WriteToolsController()
    private let notice = NSTextField(labelWithString: "")
    /// The frame of the full page. The paper grows up to it.
    private var page: CGRect = .zero
    private let frameMotion = WriteMotionDriver()
    private var targetFrame: CGRect?

    public var onClose: (() -> Void)?
    private weak var host: (any WriteHost)?

    private var pageView: NSView { editor.page.view }

    public init(host: any WriteHost, page: any EditorPage) {
        self.host = host
        window = WritePaperWindow(contentRect: .zero, styleMask: [.borderless], backing: .buffered, defer: true)
        editor = WriteWebEditor(page: page)
        super.init()

        window.isReleasedWhenClosed = false
        window.hasShadow = true
        // The window is clear, so that the sheet can have round corners.
        window.isOpaque = false
        window.backgroundColor = .clear
        window.delegate = self

        let sheet = PaperSheetView()
        pageView.autoresizingMask = [.minYMargin, .maxXMargin]
        sheet.addSubview(pageView)

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
        placePage()
        host?.bringToFront(window)
        window.makeFirstResponder(pageView)
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

    /// Puts the page at the size of the full page, with its top on the top of the sheet.
    private func placePage() {
        guard let sheet = window.contentView else { return }
        pageView.frame = NSRect(
            x: 0, y: sheet.bounds.height - page.height, width: page.width, height: page.height)
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

    /// Grows or shrinks the open paper to its text.
    private func fit() {
        guard window.isVisible else { return }
        let frame = paperFrame
        guard targetFrame != frame else { return }
        if reduceMotion {
            targetFrame = frame
            window.setFrame(frame, display: true)
            window.invalidateShadow()
        } else {
            move(to: frame, duration: Motion.paperFeed, fadeIn: window.alphaValue < 1)
        }
    }

    /// Draws the sheet of the paper with `markdown` in the editor, at `width`
    /// and as tall as its text, with no window on the screen. The snapshots
    /// and Write Lab use it. It waits up to `timeout` seconds for the page.
    /// With no `appearance`, the sheet takes the appearance of the app.
    public static func renderSheet(
        _ markdown: String, width: CGFloat, appearance: NSAppearance? = nil, timeout: TimeInterval = 10
    ) async -> NSBitmapImageRep? {
        let deadline = Date(timeIntervalSinceNow: timeout)
        func wait(until done: () -> Bool) async -> Bool {
            while !done() {
                guard Date() < deadline else { return false }
                try? await Task.sleep(for: .milliseconds(20))
            }
            return true
        }

        let page = EditorWebPage()
        let editor = WriteWebEditor(page: page)
        let pageHeight = width * WritePaper.pageRatio
        let window = NSWindow(
            contentRect: NSRect(x: -10_000, y: -10_000, width: width, height: pageHeight),
            styleMask: [.borderless], backing: .buffered, defer: false)
        window.appearance = appearance
        page.webView.frame = NSRect(x: 0, y: 0, width: width, height: pageHeight)
        window.contentView = page.webView
        window.orderFrontRegardless()
        defer { window.orderOut(nil) }

        var laidOut = false
        editor.onLayoutChange = { laidOut = true }
        editor.show(markdown)
        guard await wait(until: { page.isReady && laidOut }) else { return nil }
        // The page draws its fonts and its last frame after it reports its height.
        try? await Task.sleep(for: .seconds(Metrics.WriteMotion.snapshotSettle))

        let height = min(editor.contentHeight, pageHeight)
        let configuration = WKSnapshotConfiguration()
        configuration.rect = NSRect(x: 0, y: 0, width: width, height: height)
        guard let image = try? await page.webView.takeSnapshot(configuration: configuration),
            let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil),
            let rep = NSBitmapImageRep(
                bitmapDataPlanes: nil, pixelsWide: cg.width, pixelsHigh: cg.height, bitsPerSample: 8,
                samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                bytesPerRow: 0, bitsPerPixel: 0)
        else { return nil }
        let size = NSSize(width: width, height: height)
        rep.size = size
        let draw = {
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
            NSColor(Tokens.key).setFill()
            NSRect(origin: .zero, size: size).fill()
            image.draw(in: NSRect(origin: .zero, size: size))
            NSGraphicsContext.restoreGraphicsState()
        }
        if let appearance { appearance.performAsCurrentDrawingAppearance(draw) } else { draw() }
        return rep
    }

    // MARK: - NSWindowDelegate

    public func windowDidBecomeKey(_ notification: Notification) {
        host?.writeKeyChanged(true)
    }

    public func windowDidResignKey(_ notification: Notification) {
        host?.writeKeyChanged(false)
    }

    public func windowWillClose(_ notification: Notification) {
        frameMotion.stop()
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
