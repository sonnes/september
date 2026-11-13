import AppKit
import QuartzCore

/// The layer over the text of the editor. It holds the caret, which glides
/// to its next place after a key press and blinks when the user stops, and
/// the pop of a checkbox. The system caret is clear.
@MainActor
final class WriteOverlay {
    typealias Motion = Metrics.WriteMotion

    private unowned let textView: WriteTextView
    private let view = OverlayView()
    private let caret = CALayer()
    private var lastCaret: CGRect?
    private var blink: DispatchWorkItem?

    init(textView: WriteTextView) {
        self.textView = textView
        view.wantsLayer = true
        view.autoresizingMask = [.width, .height]
        caret.anchorPoint = .zero
        caret.cornerRadius = Metrics.WriteEditor.caretCornerRadius
        caret.isHidden = true
    }

    private var reduceMotion: Bool { NSWorkspace.shared.accessibilityDisplayShouldReduceMotion }

    /// Moves the caret to the selection. Call it after each change of the
    /// text, the selection, the size, or the focus.
    func update() {
        guard let window = textView.window else { return }
        if view.superview !== textView {
            view.frame = textView.bounds
            textView.addSubview(view)
            view.layer?.addSublayer(caret)
        }
        let focused = window.isKeyWindow && window.firstResponder === textView
        guard focused, textView.selectedRange().length == 0, let frame = textView.caretFrame() else {
            caret.isHidden = true
            lastCaret = nil
            return
        }
        caret.isHidden = false
        caret.backgroundColor = view.resolved(NSColor(Tokens.accent))
        let glide = textView.lastInputWasKey && !reduceMotion && lastCaret != nil && lastCaret != frame
        move(to: frame, glide: glide)
        lastCaret = frame
        restartBlink()
    }

    private func move(to frame: CGRect, glide: Bool) {
        let from = caret.presentation()?.frame ?? caret.frame
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        caret.frame = frame
        CATransaction.commit()
        guard glide else { return }
        let position = CAKeyframeAnimation(keyPath: "position")
        position.values = Motion.caretProgress.map { progress in
            NSValue(point: CGPoint(
                x: from.minX + (frame.minX - from.minX) * progress,
                y: from.minY + (frame.minY - from.minY) * progress))
        }
        let size = CAKeyframeAnimation(keyPath: "bounds.size")
        size.values = Motion.caretProgress.map { progress in
            NSValue(size: CGSize(
                width: from.width + (frame.width - from.width) * progress,
                height: from.height + (frame.height - from.height) * progress))
        }
        for animation in [position, size] {
            animation.keyTimes = Motion.caretKeyTimes.map { NSNumber(value: $0) }
            animation.calculationMode = .linear
            animation.duration = Motion.caretGlide
            caret.add(animation, forKey: animation.keyPath)
        }
    }

    /// Keeps the caret solid, then blinks it after a short rest.
    private func restartBlink() {
        caret.removeAnimation(forKey: "blink")
        caret.opacity = 1
        blink?.cancel()
        let work = DispatchWorkItem { [weak self] in
            guard let self else { return }
            let animation = CAKeyframeAnimation(keyPath: "opacity")
            animation.values = Motion.caretBlinkValues
            animation.keyTimes = Motion.caretBlinkKeyTimes.map { NSNumber(value: $0) }
            animation.timingFunctions = Array(repeating: CAMediaTimingFunction(name: .default), count: 3)
            animation.duration = Motion.caretBlink
            animation.repeatCount = .infinity
            caret.add(animation, forKey: "blink")
        }
        blink = work
        DispatchQueue.main.asyncAfter(deadline: .now() + Motion.caretIdle, execute: work)
    }

    // MARK: - To-do items

    /// The frame of the checkbox of the to-do item that starts at
    /// `location`, in the coordinates of the text view.
    func taskBox(at location: Int) -> CGRect? {
        guard let layoutManager = textView.textLayoutManager, let content = layoutManager.textContentManager,
            let textLocation = content.location(content.documentRange.location, offsetBy: location),
            let fragment = layoutManager.textLayoutFragment(for: textLocation) as? WriteLayoutFragment,
            let line = fragment.textLineFragments.first
        else { return nil }
        guard case .task = fragment.kind else { return nil }
        let origin = fragment.layoutFragmentFrame.origin
        return WriteLayoutFragment.taskBox(kind: fragment.kind, firstLine: line.typographicBounds)
            .offsetBy(dx: textView.textContainerOrigin.x, dy: origin.y + textView.textContainerOrigin.y)
    }

    /// The start of the to-do item whose checkbox is under `point`, or nil.
    func task(at point: CGPoint) -> Int? {
        let ns = textView.string as NSString
        for paragraph in WriteText.paragraphs(ns) {
            guard case .task = textView.kind(ofParagraph: paragraph),
                let box = taskBox(at: paragraph.location)
            else { continue }
            if box.insetBy(dx: -4, dy: -4).contains(point) { return paragraph.location }
        }
        return nil
    }

    /// Plays the check or the uncheck of a checkbox over the box that the
    /// text draws: the colours change, the box pops, and the mark scales in.
    func animateTask(at location: Int, checked: Bool) {
        guard textView.window != nil, !reduceMotion, let box = taskBox(at: location) else { return }
        let layer = TaskLayer(frame: box, checked: checked, in: view)
        view.layer?.addSublayer(layer)
        layer.play(checked: checked)
        DispatchQueue.main.asyncAfter(deadline: .now() + Motion.taskPop + 0.05) { layer.removeFromSuperlayer() }
    }
}

/// The view that holds the overlay layers. It takes no clicks.
private final class OverlayView: NSView {
    override var isFlipped: Bool { true }
    override func hitTest(_ point: NSPoint) -> NSView? { nil }

    /// The colour for the appearance of this view.
    func resolved(_ color: NSColor) -> CGColor {
        var result = color.cgColor
        effectiveAppearance.performAsCurrentDrawingAppearance { result = color.cgColor }
        return result
    }
}

/// A checkbox that plays the motion of a check or an uncheck.
@MainActor
private final class TaskLayer: CALayer {
    typealias Motion = Metrics.WriteMotion
    typealias M = Metrics.WriteEditor

    private let cover = CALayer()
    private let box = CAShapeLayer()
    private let mark = CAShapeLayer()

    init(frame: CGRect, checked: Bool, in view: OverlayView) {
        super.init()
        self.frame = frame
        let bounds = CGRect(origin: .zero, size: frame.size)
        // The cover hides the box that the text draws under the motion.
        cover.frame = bounds.insetBy(dx: -1, dy: -1)
        cover.backgroundColor = view.resolved(NSColor(Tokens.key))
        addSublayer(cover)

        let radius = M.taskBoxRadius * WriteStyle.bodySize
        let inset = bounds.insetBy(dx: M.taskBoxBorder / 2, dy: M.taskBoxBorder / 2)
        box.frame = bounds
        box.path = CGPath(roundedRect: inset, cornerWidth: radius, cornerHeight: radius, transform: nil)
        box.lineWidth = M.taskBoxBorder
        let accent = view.resolved(NSColor(Tokens.accent))
        let border = view.resolved(NSColor(Tokens.writeTaskBorder))
        box.fillColor = checked ? accent : NSColor.clear.cgColor
        box.strokeColor = checked ? accent : border
        addSublayer(box)

        mark.frame = bounds
        mark.path = WriteLayoutFragment.checkMark(in: bounds).cgPath
        mark.strokeColor = view.resolved(NSColor(Tokens.key))
        mark.fillColor = nil
        mark.lineWidth = M.taskBoxBorder * 1.3
        mark.lineCap = .round
        mark.lineJoin = .round
        mark.opacity = checked ? 1 : 0
        addSublayer(mark)
        isGeometryFlipped = true
    }

    override init(layer: Any) { super.init(layer: layer) }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    func play(checked: Bool) {
        let snappy = Motion.snappyTiming
        let fill = CABasicAnimation(keyPath: "fillColor")
        fill.fromValue = checked ? NSColor.clear.cgColor : box.strokeColor
        fill.duration = Motion.taskColor
        fill.timingFunction = snappy
        box.add(fill, forKey: "fill")

        if checked {
            let pop = CABasicAnimation(keyPath: "transform.scale")
            pop.fromValue = Motion.taskPopScale
            pop.toValue = 1
            pop.duration = Motion.taskPop
            pop.timingFunction = snappy
            box.add(pop, forKey: "pop")
        }

        let scale = CABasicAnimation(keyPath: "transform.scale")
        scale.fromValue = checked ? 0 : 1
        scale.toValue = checked ? 1 : 0
        scale.duration = Motion.taskMarkScale
        scale.timingFunction = snappy
        let fade = CABasicAnimation(keyPath: "opacity")
        fade.fromValue = checked ? 0 : 1
        fade.toValue = checked ? 1 : 0
        fade.duration = Motion.taskMarkFade
        fade.timingFunction = snappy
        mark.add(scale, forKey: "scale")
        mark.add(fade, forKey: "fade")
    }
}
