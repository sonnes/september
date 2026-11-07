import Foundation

/// The Markdown marks that change the text as the user types them, as the
/// input rules of the Piper editor do.
enum WriteInputRules {
    /// A block rule: typing a mark at the start of a paragraph makes a block.
    /// Returns the new kind and the number of UTF-16 units of the mark to
    /// remove from the start of the paragraph.
    static func block(prefix: String, kind: WriteBlockKind, isWholeParagraph: Bool) -> (WriteBlockKind, Int)? {
        let length = (prefix as NSString).length
        if case .bullet(let depth) = kind, let match = prefix.wholeMatch(of: #/\[([ xX])?\] /#) {
            return (.task(checked: (match.1 ?? " ") != " ", depth: depth), length)
        }
        switch kind {
        case .paragraph, .heading: break
        default: return nil
        }
        if let match = prefix.wholeMatch(of: #/(#{1,6}) /#) {
            return (.heading(match.1.count), length)
        }
        if prefix.wholeMatch(of: #/[-*+] /#) != nil {
            return (.bullet(depth: 0), length)
        }
        if let match = prefix.wholeMatch(of: #/(\d{1,9})[.)] /#), let number = Int(match.1) {
            return (.ordered(number: number, depth: 0), length)
        }
        if let match = prefix.wholeMatch(of: #/(?:[-*+] )?\[([ xX])?\] /#) {
            return (.task(checked: (match.1 ?? " ") != " ", depth: 0), length)
        }
        if prefix == "> " {
            return (.quote, length)
        }
        if let match = prefix.wholeMatch(of: #/(?:```|~~~)([A-Za-z0-9_+#.\-]*) /#) {
            return (.code(language: String(match.1)), length)
        }
        if isWholeParagraph, ["---", "___", "***"].contains(prefix) {
            return (.rule, length)
        }
        return nil
    }

    enum Result: Equatable {
        case mark(WriteMarks)
        case link(WriteLink)
        /// A wiki link: the target, and the text that shows.
        case wiki(target: String, shown: String)
    }

    struct Inline: Equatable {
        /// The range of the whole mark in the prefix, which the rule replaces.
        let match: NSRange
        /// The range of the text inside the mark.
        let inner: NSRange
        let result: Result
    }

    // NSRegularExpression is immutable and safe to share across threads.
    nonisolated(unsafe) private static let rules: [(NSRegularExpression, (NSTextCheckingResult, NSString) -> Result)] = [
        (#"\[\[([^\[\]|\n ]+)(?:\|([^\[\]|\n ]+))?\]\]$"#, { match, text in
            let target = text.substring(with: match.range(at: 1))
            let alias = match.range(at: 2).location == NSNotFound ? target : text.substring(with: match.range(at: 2))
            return .wiki(target: target, shown: alias)
        }),
        (#"(?<!\[)\[([^\[\]]+)\]\(([^()\s]+)\)$"#, { match, text in
            .link(.url(text.substring(with: match.range(at: 2))))
        }),
        (#"(?<![*\\\w])\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$"#, { _, _ in .mark(.bold) }),
        (#"(?<![_\\\w])__([^_\s](?:[^_]*[^_\s])?)__$"#, { _, _ in .mark(.bold) }),
        (#"(?<![~\\])~~([^~\s](?:[^~]*[^~\s])?)~~$"#, { _, _ in .mark(.strike) }),
        (#"(?<![*\\\w])\*([^*\s](?:[^*]*[^*\s])?)\*$"#, { _, _ in .mark(.italic) }),
        (#"(?<![_\\\w])_([^_\s](?:[^_]*[^_\s])?)_$"#, { _, _ in .mark(.italic) }),
        (#"(?<![`\\])`([^`]+)`$"#, { _, _ in .mark(.code) }),
    ].map { pattern, result in
        // swiftlint:disable:next force_try
        (try! NSRegularExpression(pattern: pattern), result)
    }

    /// An inline rule that the end of `prefix` completes, or nil.
    static func inline(prefix: String) -> Inline? {
        let text = prefix as NSString
        let all = NSRange(location: 0, length: text.length)
        for (expression, result) in rules {
            guard let match = expression.firstMatch(in: prefix, range: all) else { continue }
            let value = result(match, text)
            let inner = match.range(at: 1)
            if case .wiki = value {
                return Inline(match: match.range, inner: match.range, result: value)
            }
            return Inline(match: match.range, inner: inner, result: value)
        }
        return nil
    }
}
