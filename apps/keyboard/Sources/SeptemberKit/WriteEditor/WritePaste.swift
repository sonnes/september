import AppKit

/// The Markdown of a paste into the Write paper.
///
/// The pasteboard gives HTML (a browser, Mail, Google Docs), RTF (Notes,
/// Pages, TextEdit, Word), or plain text. Rich text becomes Markdown, with
/// its marks, links, headings, and lists. Plain text is Markdown already.
/// Code editors put coloured rich text in monospace on the pasteboard, with
/// the Markdown source as the plain text, so rich text that is all monospace
/// gives the plain text.
public enum WritePaste {
    /// The Markdown of the contents of `pasteboard`, or nil if it holds no
    /// text.
    public static func markdown(from pasteboard: NSPasteboard) -> String? {
        let plain = pasteboard.string(forType: .string).map(normalize)
        if let rich = richText(from: pasteboard), !rich.string.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            if let plain, isAllMonospace(rich) { return plain }
            return markdown(from: rich)
        }
        return plain
    }

    /// The plain text of `pasteboard`, with every line break as `\n`.
    public static func plainText(from pasteboard: NSPasteboard) -> String? {
        pasteboard.string(forType: .string).map(normalize)
    }

    static func normalize(_ text: String) -> String {
        text.replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .replacingOccurrences(of: "\u{2029}", with: "\n")
    }

    private static func richText(from pasteboard: NSPasteboard) -> NSAttributedString? {
        if let data = pasteboard.data(forType: .html),
            let text = try? NSAttributedString(
                data: data,
                options: [.documentType: NSAttributedString.DocumentType.html, .characterEncoding: String.Encoding.utf8.rawValue],
                documentAttributes: nil)
        {
            return text
        }
        if let data = pasteboard.data(forType: .rtf),
            let text = try? NSAttributedString(
                data: data, options: [.documentType: NSAttributedString.DocumentType.rtf], documentAttributes: nil)
        {
            return text
        }
        return nil
    }

    private static func isAllMonospace(_ text: NSAttributedString) -> Bool {
        var all = true
        text.enumerateAttribute(.font, in: NSRange(location: 0, length: text.length)) { value, range, stop in
            let run = (text.string as NSString).substring(with: range)
            guard !run.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
            if !((value as? NSFont)?.isFixedPitch ?? false) {
                all = false
                stop.pointee = true
            }
        }
        return all
    }

    // MARK: - Rich text to Markdown

    /// The Markdown of `text`: one block for each paragraph.
    public static func markdown(from text: NSAttributedString) -> String {
        let ns = normalize(text.string.replacingOccurrences(of: "\u{2028}", with: "\n")) as NSString
        let body = bodySize(text)
        var blocks: [(text: String, list: String?)] = []
        var start = 0
        while start <= ns.length {
            let search = NSRange(location: start, length: ns.length - start)
            let newline = ns.range(of: "\n", options: .literal, range: search)
            let end = newline.location == NSNotFound ? ns.length : newline.location
            let paragraph = NSRange(location: start, length: end - start)
            if let block = self.block(paragraph, in: text, ns: ns, body: body) { blocks.append(block) }
            if newline.location == NSNotFound { break }
            start = end + 1
        }
        var out = ""
        for (index, block) in blocks.enumerated() {
            // The items of one list stand on their own lines, with no blank line.
            if index > 0 { out += block.list != nil && block.list == blocks[index - 1].list ? "\n" : "\n\n" }
            out += block.text
        }
        return out
    }

    /// The most common font size, by character.
    private static func bodySize(_ text: NSAttributedString) -> CGFloat {
        var counts: [CGFloat: Int] = [:]
        text.enumerateAttribute(.font, in: NSRange(location: 0, length: text.length)) { value, range, _ in
            guard let font = value as? NSFont else { return }
            counts[font.pointSize, default: 0] += range.length
        }
        return counts.max { $0.value < $1.value }?.key ?? NSFont.systemFontSize
    }

    private static func block(
        _ paragraph: NSRange, in text: NSAttributedString, ns: NSString, body: CGFloat
    ) -> (text: String, list: String?)? {
        guard paragraph.length > 0 else { return nil }
        let style = text.attribute(.paragraphStyle, at: paragraph.location, effectiveRange: nil) as? NSParagraphStyle
        let lists = style?.textLists ?? []
        var content = paragraph
        var marker = ""
        if let list = lists.last {
            // The list marker of an item comes before its text as "\tmarker\t".
            let line = ns.substring(with: paragraph)
            if let match = line.range(of: #"^\t?[^\t]*\t"#, options: .regularExpression) {
                let prefix = String(line[match])
                let length = (prefix as NSString).length
                content = NSRange(location: paragraph.location + length, length: paragraph.length - length)
                let shown = prefix.trimmingCharacters(in: .whitespaces)
                let number = shown.prefix { $0.isNumber }
                let ordered = list.isOrdered
                marker = ordered ? "\(number.isEmpty ? "1" : String(number)). " : "- "
            } else {
                marker = list.isOrdered ? "1. " : "- "
            }
            marker = String(repeating: "  ", count: lists.count - 1) + marker
        }
        let level = lists.isEmpty ? headingLevel(content, in: text, body: body) : nil
        let inline = self.inline(content, in: text, ns: ns, dropBold: level != nil)
        guard !inline.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        if let level { return (String(repeating: "#", count: level) + " " + inline.trimmingCharacters(in: .whitespaces), nil) }
        if let list = lists.first { return (marker + inline.trimmingCharacters(in: .whitespaces), list.isOrdered ? "ordered" : "bullet") }
        return (inline.trimmingCharacters(in: .whitespaces), nil)
    }

    /// A paragraph in a larger font than the body is a heading.
    private static func headingLevel(_ range: NSRange, in text: NSAttributedString, body: CGFloat) -> Int? {
        var smallest = CGFloat.greatestFiniteMagnitude
        text.enumerateAttribute(.font, in: range) { value, run, _ in
            let part = (text.string as NSString).substring(with: run)
            guard !part.trimmingCharacters(in: .whitespaces).isEmpty, let font = value as? NSFont else { return }
            smallest = min(smallest, font.pointSize)
        }
        guard smallest < .greatestFiniteMagnitude, body > 0 else { return nil }
        let ratio = smallest / body
        if ratio >= 1.8 { return 1 }
        if ratio >= 1.4 { return 2 }
        if ratio >= 1.15 { return 3 }
        return nil
    }

    private struct Segment {
        var text: String
        var bold = false
        var italic = false
        var strike = false
        var code = false
        var link: String?

        func sameStyle(as other: Segment) -> Bool {
            bold == other.bold && italic == other.italic && strike == other.strike && code == other.code
                && link == other.link
        }
    }

    private static func inline(_ range: NSRange, in text: NSAttributedString, ns: NSString, dropBold: Bool) -> String {
        var segments: [Segment] = []
        text.enumerateAttributes(in: range) { attributes, run, _ in
            var segment = Segment(text: ns.substring(with: run))
            if let font = attributes[.font] as? NSFont {
                let traits = font.fontDescriptor.symbolicTraits
                segment.bold = traits.contains(.bold) && !dropBold
                segment.italic = traits.contains(.italic)
                segment.code = font.isFixedPitch
            }
            segment.strike = ((attributes[.strikethroughStyle] as? NSNumber)?.intValue ?? 0) != 0
            if let url = attributes[.link] as? URL {
                segment.link = url.absoluteString
            } else if let url = attributes[.link] as? String {
                segment.link = url
            }
            // Text with no letters, such as a space, does not break a mark.
            if let last = segments.last, last.sameStyle(as: segment) || isBlank(segment.text) && segment.link == last.link {
                segments[segments.count - 1].text += segment.text
            } else {
                segments.append(segment)
            }
        }
        return segments.map(render).joined()
    }

    private static func isBlank(_ text: String) -> Bool {
        text.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private static func render(_ segment: Segment) -> String {
        let text = segment.text.replacingOccurrences(of: "\u{00A0}", with: " ")
        let core = text.trimmingCharacters(in: .whitespaces)
        guard !core.isEmpty else { return text }
        let lead = String(text.prefix { $0 == " " })
        let trail = String(text.reversed().prefix { $0 == " " })
        var out = segment.code ? "`\(core)`" : core
        if segment.italic { out = "*\(out)*" }
        if segment.bold { out = "**\(out)**" }
        if segment.strike { out = "~~\(out)~~" }
        if let link = segment.link { out = "[\(out)](\(link))" }
        return lead + out + trail
    }
}

extension NSTextList {
    fileprivate var isOrdered: Bool {
        switch markerFormat {
        case .decimal, .lowercaseAlpha, .uppercaseAlpha, .lowercaseRoman, .uppercaseRoman, .octal,
            .lowercaseHexadecimal, .uppercaseHexadecimal:
            true
        default:
            markerFormat.rawValue.contains("decimal")
        }
    }
}
