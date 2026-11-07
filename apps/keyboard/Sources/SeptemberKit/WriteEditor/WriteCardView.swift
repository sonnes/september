import AppKit
import QuartzCore

/// A card on the desk of Write: a small sheet of paper with the title, the
/// first lines, and the date of a document. The first card of the desk is
/// New Document, with a dashed border.
///
/// A card is a button for accessibility, with the title, the date, and the
/// first line as its label, so that dwell, Switch Control, and Voice Control
/// can press it.
@MainActor
final class WriteCardView: NSView {
    typealias Sizes = Metrics.WriteDesk

    var onPress: (() -> Void)?
    var isSelected = false {
        didSet {
            guard isSelected != oldValue else { return }
            needsDisplay = true
            setAccessibilitySelected(isSelected)
        }
    }

    private let isNewDocument: Bool
    private let dash = CAShapeLayer()

    init(title: String, lines: [String], date: String) {
        isNewDocument = false
        super.init(frame: .zero)
        setUp()
        let titleField = Self.label(title, font: Typography.writeCardTitle, color: Tokens.writeText, lines: 2)
        let body = Self.label(
            lines.joined(separator: "\n"), font: Typography.writeCardLine, color: Tokens.writeMuted,
            lines: Sizes.cardLines)
        let dateField = Self.label(date, font: Typography.writeCardLine, color: Tokens.writeMuted, lines: 1)
        let stack = NSStackView(views: [titleField, body])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = Sizes.actionGap
        stack.translatesAutoresizingMaskIntoConstraints = false
        dateField.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        addSubview(dateField)
        let padding = Sizes.cardPadding
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: topAnchor, constant: padding),
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: padding),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -padding),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: dateField.topAnchor, constant: -padding / 2),
            dateField.leadingAnchor.constraint(equalTo: leadingAnchor, constant: padding),
            dateField.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -padding * 3 / 4),
        ])
        setAccessibilityLabel([title, date, lines.first].compactMap { $0 }.joined(separator: ", "))
    }

    init(newDocument: Void) {
        isNewDocument = true
        super.init(frame: .zero)
        setUp()
        let label = Self.label("+\nNew Document\n⌘N", font: Typography.writeCardNew, color: Tokens.writeMuted, lines: 3)
        label.alignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: centerXAnchor),
            label.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
        dash.fillColor = nil
        dash.lineWidth = Sizes.newCardBorder
        dash.lineDashPattern = Sizes.newCardDash.map { NSNumber(value: Double($0)) }
        layer?.addSublayer(dash)
        setAccessibilityLabel("New Document")
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    private func setUp() {
        wantsLayer = true
        layer?.cornerRadius = Sizes.cardCornerRadius
        layer?.cornerCurve = .continuous
        layer?.shadowOpacity = 1
        layer?.shadowRadius = Sizes.spacing
        layer?.shadowOffset = CGSize(width: 0, height: -Sizes.actionGap)
        setAccessibilityElement(true)
        setAccessibilityRole(.button)
    }

    private static func label(_ text: String, font: NSFont, color: ThemeColor, lines: Int) -> NSTextField {
        let field = NSTextField(wrappingLabelWithString: text)
        field.font = font
        field.textColor = NSColor(color)
        field.maximumNumberOfLines = lines
        field.lineBreakMode = .byTruncatingTail
        field.isSelectable = false
        field.setAccessibilityElement(false)
        field.preferredMaxLayoutWidth = Sizes.cardSize.width - 2 * Sizes.cardPadding
        return field
    }

    override var wantsUpdateLayer: Bool { true }

    override func updateLayer() {
        guard let layer else { return }
        let ring = Sizes.selectionRing
        // A card with no fill has no shadow, or the shadow falls on its text.
        let isOutline = isNewDocument && !isSelected
        layer.backgroundColor = isOutline ? nil : NSColor(Tokens.writePaper).cgColor
        layer.shadowColor = NSColor(Tokens.writeCardShadow).cgColor
        layer.shadowOpacity = isOutline ? 0 : 1
        dash.isHidden = !isOutline
        dash.strokeColor = NSColor(Tokens.writeMuted).cgColor
        dash.frame = bounds
        dash.path = CGPath(
            roundedRect: bounds.insetBy(dx: Sizes.newCardBorder / 2, dy: Sizes.newCardBorder / 2),
            cornerWidth: Sizes.cardCornerRadius, cornerHeight: Sizes.cardCornerRadius, transform: nil)
        layer.borderWidth = isSelected ? ring : 0
        layer.borderColor = NSColor(Tokens.writeAccent).cgColor
    }

    override func layout() {
        super.layout()
        needsDisplay = true
    }

    // MARK: - Press

    override func mouseDown(with event: NSEvent) {
        onPress?()
    }

    override func accessibilityPerformPress() -> Bool {
        onPress?()
        return true
    }

    // MARK: - Motion

    /// The card rises out of the bar: from below its place, small, and clear.
    func animateRise(delay: TimeInterval) {
        animate(from: awayTransform, to: CATransform3DIdentity, opacity: (0, 1), delay: delay, keep: false)
    }

    /// The card goes back down into the bar.
    func animateAway(delay: TimeInterval) {
        animate(from: CATransform3DIdentity, to: awayTransform, opacity: (1, 0), delay: delay, keep: true)
    }

    /// Down and smaller. The layer of a view scales from its bottom-left
    /// corner, so the move keeps the card centred.
    private var awayTransform: CATransform3D {
        let scale = Sizes.riseScale
        let shift = CATransform3DMakeTranslation(
            bounds.width * (1 - scale) / 2, -Sizes.riseDepth, 0)
        return CATransform3DConcat(CATransform3DMakeScale(scale, scale, 1), shift)
    }

    private func animate(
        from: CATransform3D, to: CATransform3D, opacity: (Float, Float), delay: TimeInterval, keep: Bool
    ) {
        guard let layer else { return }
        let start = CACurrentMediaTime() + delay
        let move = CABasicAnimation(keyPath: "transform")
        move.fromValue = from
        move.toValue = to
        let fade = CABasicAnimation(keyPath: "opacity")
        fade.fromValue = opacity.0
        fade.toValue = opacity.1
        for animation in [move, fade] {
            animation.beginTime = start
            animation.duration = Metrics.WriteMotion.deskCards
            animation.timingFunction = CAMediaTimingFunction(name: .easeOut)
            animation.fillMode = keep ? .both : .backwards
            animation.isRemovedOnCompletion = !keep
        }
        layer.add(move, forKey: "deskMove")
        layer.add(fade, forKey: "deskFade")
    }
}
