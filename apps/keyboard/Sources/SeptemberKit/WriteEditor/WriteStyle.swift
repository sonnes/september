import AppKit

/// The look of the text of the native Write editor: the font, the colour,
/// and the paragraph style of each block and mark.
enum WriteStyle {
    typealias M = Metrics.WriteEditor

    static var bodySize: CGFloat { M.textSize }

    static func size(_ kind: WriteBlockKind) -> CGFloat {
        switch kind {
        case .heading(let level): bodySize * M.headingScale[min(max(level, 1), 6) - 1]
        case .code, .raw: bodySize * M.codeScale
        default: bodySize
        }
    }

    /// The line height of a block, in points.
    static func lineHeight(_ kind: WriteBlockKind) -> CGFloat {
        switch kind {
        case .heading(let level): size(kind) * M.headingLineHeight[min(max(level, 1), 6) - 1]
        default: size(kind) * M.lineHeight
        }
    }

    static func font(_ kind: WriteBlockKind, marks: WriteMarks) -> NSFont {
        let size = size(kind)
        if kind.isLiteral { return Typography.writeEditor(size: size, monospaced: true) }
        if marks.contains(.code) {
            return Typography.writeEditor(size: size * M.codeScale, monospaced: true)
        }
        var weight: NSFont.Weight = .regular
        if case .heading = kind { weight = .semibold }
        if marks.contains(.bold) { weight = .bold }
        return Typography.writeEditor(size: size, weight: weight, italic: marks.contains(.italic))
    }

    static func color(_ kind: WriteBlockKind) -> NSColor {
        switch kind {
        case .quote: NSColor(Tokens.writeQuote)
        case .heading(let level) where level >= 4: level == 5 ? NSColor(Tokens.keyText) : NSColor(Tokens.writeQuote)
        default: NSColor(Tokens.keyText)
        }
    }

    static func indent(_ kind: WriteBlockKind) -> CGFloat {
        switch kind {
        case .bullet(let depth), .ordered(_, let depth):
            CGFloat(depth + 1) * M.listIndent
        case .task(_, let depth):
            CGFloat(depth + 1) * M.listIndent + M.taskBox * bodySize + M.taskGap
        case .quote:
            M.quoteIndent * 2
        case .code:
            M.codePaddingHorizontal
        default:
            0
        }
    }

    static func paragraphStyle(_ kind: WriteBlockKind, next: WriteBlockKind?, isFirst: Bool) -> NSParagraphStyle {
        let style = NSMutableParagraphStyle()
        let height = lineHeight(kind)
        style.minimumLineHeight = height
        style.maximumLineHeight = height
        style.headIndent = indent(kind)
        style.firstLineHeadIndent = indent(kind)
        let size = size(kind)
        var after = M.blockGap * bodySize
        if kind.listDepth != nil, next?.listDepth != nil { after = M.listGap * bodySize }
        var before: CGFloat = 0
        switch kind {
        case .heading:
            if !isFirst { before = M.headingSpaceBefore * size - M.blockGap * bodySize }
        case .code:
            style.tailIndent = -M.codePaddingHorizontal
            before = M.codePaddingVertical
            after += M.codePaddingVertical
        default:
            break
        }
        style.paragraphSpacingBefore = max(0, before)
        style.paragraphSpacing = after
        style.lineBreakMode = .byWordWrapping
        return style
    }

    /// Raises the glyphs so that they sit in the middle of a line that is
    /// taller than the font, as CSS places text in its line.
    static func baselineOffset(_ font: NSFont, lineHeight: CGFloat) -> CGFloat {
        let natural = font.ascender - font.descender + font.leading
        return max(0, (lineHeight - natural) / 2)
    }

    /// Sets the look of every character of `range`, which is one paragraph
    /// and its line break.
    static func apply(
        to text: NSMutableAttributedString, paragraph range: NSRange, kind: WriteBlockKind,
        next: WriteBlockKind?, isFirst: Bool
    ) {
        let paragraph = paragraphStyle(kind, next: next, isFirst: isFirst)
        let height = lineHeight(kind)
        let color = color(kind)
        text.enumerateAttribute(.writeMarks, in: range) { value, run, _ in
            let marks = kind.isLiteral ? [] : WriteMarks(rawValue: (value as? NSNumber)?.intValue ?? 0)
            let font = font(kind, marks: marks)
            var attributes: [NSAttributedString.Key: Any] = [
                .font: font,
                .paragraphStyle: paragraph,
                .foregroundColor: color,
                .baselineOffset: baselineOffset(font, lineHeight: height),
            ]
            if marks.contains(.strike) { attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue }
            if marks.contains(.code) { attributes[.backgroundColor] = NSColor(Tokens.keySpecial) }
            text.setAttributes(merging: attributes, keep: [.writeBlock, .writeMarks, .writeLink, .writeOrdinal], in: run)
        }
        text.enumerateAttribute(.writeLink, in: range) { value, run, _ in
            guard value != nil else { return }
            text.addAttributes(
                [
                    .foregroundColor: NSColor(Tokens.accent),
                    .underlineStyle: NSUnderlineStyle.single.rawValue,
                ], range: run)
        }
    }

    /// The attributes that text typed into a block of this kind starts with.
    static func typingAttributes(
        _ box: WriteBlockBox, marks: WriteMarks, link: WriteLink?
    ) -> [NSAttributedString.Key: Any] {
        let kind = box.kind
        let font = font(kind, marks: marks)
        var attributes: [NSAttributedString.Key: Any] = [
            .writeBlock: box,
            .font: font,
            .paragraphStyle: paragraphStyle(kind, next: nil, isFirst: false),
            .foregroundColor: color(kind),
            .baselineOffset: baselineOffset(font, lineHeight: lineHeight(kind)),
        ]
        if !marks.isEmpty, !kind.isLiteral { attributes[.writeMarks] = NSNumber(value: marks.rawValue) }
        if let link { attributes[.writeLink] = WriteLinkBox(link) }
        return attributes
    }
}

extension NSMutableAttributedString {
    /// Replaces every attribute of `range` with `attributes`, and keeps the
    /// attributes named in `keep`.
    func setAttributes(merging attributes: [NSAttributedString.Key: Any], keep: [NSAttributedString.Key], in range: NSRange) {
        enumerateAttributes(in: range) { existing, run, _ in
            var next = attributes
            for key in keep { if let value = existing[key] { next[key] = value } }
            setAttributes(next, range: run)
        }
    }
}
