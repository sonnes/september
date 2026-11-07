import AppKit

/// The layout of one block. It draws what the block shows around its text:
/// the bullet or the number of a list item, the checkbox of a to-do item,
/// the bar of a quote, the fill of a code block, and the line of a rule.
final class WriteLayoutFragment: NSTextLayoutFragment {
    typealias M = Metrics.WriteEditor

    private var attributes: [NSAttributedString.Key: Any] {
        guard let paragraph = textElement as? NSTextParagraph, paragraph.attributedString.length > 0 else { return [:] }
        return paragraph.attributedString.attributes(at: 0, effectiveRange: nil)
    }

    var kind: WriteBlockKind { (attributes[.writeBlock] as? WriteBlockBox)?.kind ?? .paragraph }

    private var isEmpty: Bool {
        guard let paragraph = textElement as? NSTextParagraph else { return true }
        return paragraph.attributedString.string.trimmingCharacters(in: .newlines).isEmpty
    }

    override var renderingSurfaceBounds: CGRect {
        let frame = layoutFragmentFrame
        return super.renderingSurfaceBounds.union(CGRect(x: -frame.minX, y: 0, width: frame.maxX, height: frame.height))
    }

    /// The bounds of the text lines, in the coordinates of the fragment.
    private var lines: (first: CGRect, last: CGRect)? {
        guard let first = textLineFragments.first, let last = textLineFragments.last else { return nil }
        return (first.typographicBounds, last.typographicBounds)
    }

    override func draw(at point: CGPoint, in context: CGContext) {
        if let lines {
            NSGraphicsContext.saveGraphicsState()
            NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: true)
            drawDecoration(at: point, first: lines.first, last: lines.last)
            NSGraphicsContext.restoreGraphicsState()
        }
        super.draw(at: point, in: context)
    }

    private func drawDecoration(at point: CGPoint, first: CGRect, last: CGRect) {
        let kind = kind
        let indent = WriteStyle.indent(kind)
        let size = WriteStyle.size(kind)
        let x = point.x
        let y = point.y
        switch kind {
        case .bullet:
            let diameter = size * 0.3
            let rect = CGRect(
                x: x + indent - M.listIndent / 2 - diameter / 2, y: y + first.midY - diameter / 2,
                width: diameter, height: diameter)
            NSColor(Tokens.writeMuted).setFill()
            NSBezierPath(ovalIn: rect).fill()
        case .ordered:
            let number = (attributes[.writeOrdinal] as? NSNumber)?.intValue ?? 1
            let font = WriteStyle.font(.paragraph, marks: [])
            let label = NSAttributedString(
                string: "\(number).", attributes: [.font: font, .foregroundColor: NSColor(Tokens.writeMuted)])
            let width = label.size().width
            let height = font.ascender - font.descender
            label.draw(at: CGPoint(x: x + indent - width - M.listIndent * 0.25, y: y + first.midY - height / 2))
        case .task(let checked, _):
            Self.drawTaskBox(Self.taskBox(kind: kind, firstLine: first).offsetBy(dx: x, dy: y), checked: checked)
        case .quote:
            let rect = CGRect(
                x: x + M.quoteIndent - M.quoteBarWidth, y: y + first.minY, width: M.quoteBarWidth,
                height: last.maxY - first.minY)
            NSColor(Tokens.writeStroke).setFill()
            NSBezierPath(roundedRect: rect, xRadius: 1, yRadius: 1).fill()
        case .code:
            let rect = CGRect(
                x: x, y: y + first.minY - M.codePaddingVertical, width: layoutFragmentFrame.width,
                height: last.maxY - first.minY + 2 * M.codePaddingVertical)
            NSColor(Tokens.writeCode).setFill()
            NSBezierPath(roundedRect: rect, xRadius: M.codeCornerRadius, yRadius: M.codeCornerRadius).fill()
        case .rule:
            let rect = CGRect(x: x, y: y + first.midY, width: layoutFragmentFrame.width, height: M.ruleThickness)
            NSColor(Tokens.writeStroke).setFill()
            rect.fill()
        case .heading(let level) where isEmpty:
            let font = WriteStyle.font(kind, marks: [])
            let label = NSAttributedString(
                string: "Heading \(level)", attributes: [.font: font, .foregroundColor: NSColor(Tokens.writeMuted)])
            let height = font.ascender - font.descender
            label.draw(at: CGPoint(x: x + first.minX, y: y + first.midY - height / 2))
        default:
            break
        }
    }

    /// The checkbox of a to-do item, in the coordinates of its fragment.
    static func taskBox(kind: WriteBlockKind, firstLine: CGRect) -> CGRect {
        let side = M.taskBox * WriteStyle.bodySize
        let x = WriteStyle.indent(kind) - M.taskGap - side
        return CGRect(x: x, y: firstLine.midY - side / 2, width: side, height: side)
    }

    static func drawTaskBox(_ rect: CGRect, checked: Bool) {
        let radius = M.taskBoxRadius * WriteStyle.bodySize
        let inset = rect.insetBy(dx: M.taskBoxBorder / 2, dy: M.taskBoxBorder / 2)
        let path = NSBezierPath(roundedRect: inset, xRadius: radius, yRadius: radius)
        if checked {
            NSColor(Tokens.writeAccent).setFill()
            path.fill()
            let mark = checkMark(in: rect)
            NSColor(Tokens.writePaper).setStroke()
            mark.lineWidth = M.taskBoxBorder * 1.3
            mark.lineCapStyle = .round
            mark.lineJoinStyle = .round
            mark.stroke()
        } else {
            NSColor(Tokens.writeTaskBorder).setStroke()
            path.lineWidth = M.taskBoxBorder
            path.stroke()
        }
    }

    /// The check mark of a box, in a flipped space.
    static func checkMark(in rect: CGRect) -> NSBezierPath {
        let side = rect.width * M.taskMark
        let origin = CGPoint(x: rect.midX - side / 2, y: rect.midY - side / 2)
        let path = NSBezierPath()
        path.move(to: CGPoint(x: origin.x + side * 0.2, y: origin.y + side * 0.52))
        path.line(to: CGPoint(x: origin.x + side * 0.42, y: origin.y + side * 0.72))
        path.line(to: CGPoint(x: origin.x + side * 0.8, y: origin.y + side * 0.3))
        return path
    }
}
