import Foundation

/// The text that the voice reads for a Markdown document: the words without
/// the Markdown marks.
///
/// - A heading loses its `#` marks and ends with a full stop, so the voice
///   stops before the next line.
/// - A list item loses its `-`, `*`, or `+`, and a to-do loses its box. A
///   numbered item keeps its number.
/// - A quote loses its `>`.
/// - Bold, italic, struck, and marked words lose their marks.
/// - A link, an image, and a `[[` document link become their text.
/// - Code keeps its text and loses its backticks and fences.
/// - Rules, table borders, and footnote marks go away. A table row becomes
///   its cells, with commas between them.
/// - An escaped mark, such as `\*`, stays as the mark.
public enum MarkdownSpeech {
    public static func plainText(_ markdown: String) -> String {
        var lines: [String] = []
        var fence: String?
        for raw in markdown.components(separatedBy: "\n") {
            let line = raw.hasSuffix("\r") ? String(raw.dropLast()) : raw
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if let open = fence {
                if trimmed.hasPrefix(open) { fence = nil } else { lines.append(line) }
                continue
            }
            if trimmed.hasPrefix("```") || trimmed.hasPrefix("~~~") {
                fence = String(trimmed.prefix(3))
                continue
            }
            if let words = block(trimmed) { lines.append(words) }
        }
        return
            lines
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .joined(separator: "\n")
            .replacing(/\n{3,}/, with: "\n\n")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// The spoken text of one line that is not code, or `nil` for a line
    /// that the voice skips, such as a rule.
    private static func block(_ line: String) -> String? {
        var text = line
        while let quote = text.firstMatch(of: /^>\s?/) {
            text = String(text[quote.range.upperBound...])
        }
        if text.wholeMatch(of: /([-*_])(\s*\1){2,}\s*/) != nil { return nil }
        if text.wholeMatch(of: /\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?/) != nil, text.contains("|") {
            return nil
        }

        if let heading = text.wholeMatch(of: /#{1,6}\s+(.*?)(\s+#+)?\s*/) {
            let words = inline(String(heading.1))
            guard let last = words.last else { return words }
            return ".!?:;".contains(last) ? words : words + "."
        }
        if text.hasPrefix("|") {
            let cells = text.trimmingCharacters(in: CharacterSet(charactersIn: "| "))
                .split(separator: "|", omittingEmptySubsequences: false)
                .map { inline($0.trimmingCharacters(in: .whitespaces)) }
            return cells.joined(separator: ", ")
        }
        text = text.replacing(/^[-*+]\s+/, with: "")
        text = text.replacing(/^\[[ xX]\]\s+/, with: "")
        text = text.replacing(/^\[\^[^\]]+\]:\s*/, with: "")
        return inline(text)
    }

    /// The words of a line without the inline marks.
    private static func inline(_ line: String) -> String {
        // An escaped mark and the text of code must not count as marks, so
        // each of their marks hides as a private character until the end.
        var text = line.replacing(/\\([!-\/:-@\[-`{-~])/) { hide($0.1) }
        text = text.replacing(/`([^`]+)`/) { hide($0.1) }

        text = text.replacing(/!\[([^\]]*)\]\([^)]*\)/) { String($0.1) }
        text = text.replacing(/\[\[([^\]|]+)\|([^\]]+)\]\]/) { String($0.2) }
        text = text.replacing(/\[\[([^\]]+)\]\]/) { String($0.1) }
        text = text.replacing(/\[\^[^\]]+\]/, with: "")
        text = text.replacing(/\[([^\]]+)\]\([^)]*\)/) { String($0.1) }
        text = text.replacing(/\[([^\]]+)\]\[[^\]]*\]/) { String($0.1) }
        text = text.replacing(/<((?:https?|mailto):[^>]+)>/) { String($0.1) }

        text = text.replacing(/\*\*\*(.+?)\*\*\*/) { String($0.1) }
        text = text.replacing(/\*\*(.+?)\*\*/) { String($0.1) }
        // A mark inside a word, as in `snake_case`, or a mark with a space
        // after it, as in `2 * 3`, is no mark.
        text = words(#"(?<!\w)__(.+?)__(?!\w)"#, in: text)
        text = words(#"(?<![\w*])\*(?![\s*])(.+?)(?<![\s*])\*(?![\w*])"#, in: text)
        text = words(#"(?<!\w)_(?![\s_])(.+?)(?<![\s_])_(?!\w)"#, in: text)
        text = text.replacing(/~~(.+?)~~/) { String($0.1) }
        text = text.replacing(/==(.+?)==/) { String($0.1) }

        // A link or a mark can leave two spaces where it was.
        text = text.replacing(/\ {2,}/, with: " ")
        return show(text)
    }

    /// Replaces each match of `pattern` with its first group. Swift `Regex`
    /// has no lookbehind, so these patterns use `NSRegularExpression`.
    private static func words(_ pattern: String, in text: String) -> String {
        // The patterns are constants, so they always compile.
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return text }
        return regex.stringByReplacingMatches(
            in: text, range: NSRange(text.startIndex..., in: text), withTemplate: "$1")
    }

    /// The start of the private characters that hide the marks.
    private static let hidden: UInt32 = 0xF0000

    private static func hide(_ text: Substring) -> String {
        String(
            String.UnicodeScalarView(
                text.unicodeScalars.map { scalar in
                    scalar.isASCII && scalar.properties.isPunctuationOrSymbol
                        ? Unicode.Scalar(hidden + scalar.value) ?? scalar : scalar
                }))
    }

    private static func show(_ text: String) -> String {
        String(
            String.UnicodeScalarView(
                text.unicodeScalars.map { scalar in
                    (hidden..<hidden + 0x80).contains(scalar.value)
                        ? Unicode.Scalar(scalar.value - hidden) ?? scalar : scalar
                }))
    }
}

extension Unicode.Scalar.Properties {
    /// True for the ASCII characters that Markdown can use as marks.
    fileprivate var isPunctuationOrSymbol: Bool {
        switch generalCategory {
        case .connectorPunctuation, .dashPunctuation, .openPunctuation, .closePunctuation,
            .initialPunctuation, .finalPunctuation, .otherPunctuation, .mathSymbol,
            .currencySymbol, .modifierSymbol, .otherSymbol:
            true
        default:
            false
        }
    }
}
