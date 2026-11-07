import AppKit

extension NSAttributedString.Key {
    /// The block of a paragraph: a `WriteBlockBox`. Every character of a
    /// paragraph, and its line break, holds the same box.
    static let writeBlock = NSAttributedString.Key("september.write.block")
    /// The inline marks of a character: an `NSNumber` of `WriteMarks`.
    static let writeMarks = NSAttributedString.Key("september.write.marks")
    /// The link of a character: a `WriteLinkBox`.
    static let writeLink = NSAttributedString.Key("september.write.link")
    /// The number that a numbered list item shows: an `NSNumber`. The style
    /// sets it from the items before the item.
    static let writeOrdinal = NSAttributedString.Key("september.write.ordinal")
}

/// The kind and the source of a block, as an attribute value.
final class WriteBlockBox: NSObject {
    let kind: WriteBlockKind
    let source: WriteSource?

    init(kind: WriteBlockKind, source: WriteSource? = nil) {
        self.kind = kind
        self.source = source
    }

    func with(kind: WriteBlockKind) -> WriteBlockBox { WriteBlockBox(kind: kind, source: source) }

    override func isEqual(_ object: Any?) -> Bool {
        guard let other = object as? WriteBlockBox else { return false }
        return other.kind == kind && other.source == source
    }

    override var hash: Int {
        var hasher = Hasher()
        hasher.combine(kind)
        hasher.combine(source?.index)
        return hasher.finalize()
    }
}

/// A link, as an attribute value.
final class WriteLinkBox: NSObject {
    let link: WriteLink

    init(_ link: WriteLink) { self.link = link }

    override func isEqual(_ object: Any?) -> Bool { (object as? WriteLinkBox)?.link == link }
    override var hash: Int { link.hashValue }
}

/// Converts between the blocks of a document and the text of the editor.
/// Each block is one paragraph. The text holds no Markdown marks. The marks
/// and the block kinds are attributes.
enum WriteText {
    static func attributed(_ blocks: [WriteBlock]) -> NSMutableAttributedString {
        let text = NSMutableAttributedString()
        for (index, block) in blocks.enumerated() {
            let box = WriteBlockBox(kind: block.kind, source: block.source)
            for run in block.runs {
                var attributes: [NSAttributedString.Key: Any] = [.writeBlock: box]
                if !run.marks.isEmpty { attributes[.writeMarks] = NSNumber(value: run.marks.rawValue) }
                if let link = run.link { attributes[.writeLink] = WriteLinkBox(link) }
                text.append(NSAttributedString(string: run.text, attributes: attributes))
            }
            if index < blocks.count - 1 {
                text.append(NSAttributedString(string: "\n", attributes: [.writeBlock: box]))
            }
        }
        return text
    }

    /// The ranges of the paragraphs, without their line breaks. Text that
    /// ends with a line break has an empty paragraph at its end.
    static func paragraphs(_ string: NSString) -> [NSRange] {
        var ranges: [NSRange] = []
        var start = 0
        while true {
            let search = NSRange(location: start, length: string.length - start)
            let newline = string.range(of: "\n", options: .literal, range: search)
            if newline.location == NSNotFound {
                ranges.append(NSRange(location: start, length: string.length - start))
                return ranges
            }
            ranges.append(NSRange(location: start, length: newline.location - start))
            start = newline.location + 1
        }
    }

    /// The paragraph that holds `location`, without its line break.
    static func paragraph(at location: Int, in string: NSString) -> NSRange {
        var start = location
        while start > 0, string.character(at: start - 1) != 0x0A { start -= 1 }
        var end = location
        while end < string.length, string.character(at: end) != 0x0A { end += 1 }
        return NSRange(location: start, length: end - start)
    }

    /// The box of the paragraph at `range`: the box of its first character,
    /// or of its line break when it is empty.
    static func box(of range: NSRange, in text: NSAttributedString) -> WriteBlockBox? {
        guard range.location < text.length else { return nil }
        return text.attribute(.writeBlock, at: range.location, effectiveRange: nil) as? WriteBlockBox
    }

    static func blocks(_ text: NSAttributedString, trailing: WriteBlockBox? = nil) -> [WriteBlock] {
        let string = text.string as NSString
        let ranges = paragraphs(string)
        return ranges.enumerated().map { index, range in
            let isLastEmpty = index == ranges.count - 1 && range.length == 0
            let box = isLastEmpty ? (trailing ?? WriteBlockBox(kind: .paragraph)) : box(of: range, in: text)
            var runs: [WriteRun] = []
            text.enumerateAttributes(in: range) { attributes, runRange, _ in
                let marks = WriteMarks(rawValue: (attributes[.writeMarks] as? NSNumber)?.intValue ?? 0)
                let link = (attributes[.writeLink] as? WriteLinkBox)?.link
                runs.append(WriteRun(string.substring(with: runRange), marks: marks, link: link))
            }
            let kind = box?.kind ?? .paragraph
            if kind.isLiteral { runs = runs.map { WriteRun($0.text) } }
            return WriteBlock(kind: kind, runs: runs, source: box?.source)
        }
    }

    /// The marks of the character at `location`, or none.
    static func marks(at location: Int, in text: NSAttributedString) -> WriteMarks {
        guard location >= 0, location < text.length else { return [] }
        return WriteMarks(rawValue: (text.attribute(.writeMarks, at: location, effectiveRange: nil) as? NSNumber)?.intValue ?? 0)
    }
}
