import Foundation

/// Reads the inline Markdown of a block into runs: emphasis, strikethrough,
/// code, web links, and `[[` wiki links. It follows the delimiter rules of
/// CommonMark for `*` and `_`. Any other syntax stays as text.
enum WriteInlineParser {
    static func runs(_ text: String) -> [WriteRun] {
        let block = WriteBlock(kind: .paragraph, runs: parse(Array(text), link: nil))
        return block.normalizedRuns
    }

    // MARK: - Tokens

    private final class Node {
        var text: String
        var marks: WriteMarks
        var link: WriteLink?
        /// The delimiter character, for a run of `*`, `_`, or `~`.
        var delimiter: Character?
        var count: Int
        var canOpen = false
        var canClose = false

        init(text: String, marks: WriteMarks = [], link: WriteLink? = nil) {
            self.text = text
            self.marks = marks
            self.link = link
            self.count = 0
        }

        init(delimiter: Character, count: Int, canOpen: Bool, canClose: Bool) {
            self.text = ""
            self.marks = []
            self.delimiter = delimiter
            self.count = count
            self.canOpen = canOpen
            self.canClose = canClose
        }
    }

    private static func parse(_ chars: [Character], link: WriteLink?) -> [WriteRun] {
        var nodes: [Node] = []
        var plain = ""
        func flush() {
            if !plain.isEmpty { nodes.append(Node(text: plain, link: link)) }
            plain = ""
        }

        var i = 0
        while i < chars.count {
            let c = chars[i]
            if c == "\\", i + 1 < chars.count, chars[i + 1].isASCII, chars[i + 1].isPunctuation || chars[i + 1].isSymbol {
                plain.append(c)
                plain.append(chars[i + 1])
                i += 2
                continue
            }
            if c == "`", let (code, end) = codeSpan(chars, at: i) {
                flush()
                nodes.append(Node(text: code, marks: .code, link: link))
                i = end
                continue
            }
            if link == nil, c == "[", let (run, end) = wikiLink(chars, at: i) {
                flush()
                nodes.append(Node(text: run.text, link: run.link))
                i = end
                continue
            }
            if link == nil, c == "[", let (inner, url, end) = webLink(chars, at: i) {
                flush()
                for run in parse(inner, link: .url(url)) {
                    nodes.append(Node(text: run.text, marks: run.marks, link: run.link))
                }
                i = end
                continue
            }
            if c == "*" || c == "_" || c == "~" {
                var end = i
                while end < chars.count, chars[end] == c { end += 1 }
                let count = end - i
                let before: Character? = i > 0 ? chars[i - 1] : nil
                let after: Character? = end < chars.count ? chars[end] : nil
                let left = isLeftFlanking(before: before, after: after)
                let right = isLeftFlanking(before: after, after: before)
                var canOpen = left
                var canClose = right
                if c == "_" {
                    canOpen = left && (!right || isPunctuation(before))
                    canClose = right && (!left || isPunctuation(after))
                }
                if c == "~", count != 2 {
                    canOpen = false
                    canClose = false
                }
                flush()
                nodes.append(Node(delimiter: c, count: count, canOpen: canOpen, canClose: canClose))
                i = end
                continue
            }
            plain.append(c)
            i += 1
        }
        flush()
        processEmphasis(&nodes)

        return nodes.compactMap { node in
            if let delimiter = node.delimiter {
                guard node.count > 0 else { return nil }
                return WriteRun(String(repeating: delimiter, count: node.count), marks: node.marks, link: link)
            }
            return WriteRun(node.text, marks: node.marks, link: node.link)
        }
    }

    /// Matches each closing delimiter with the nearest opening one, as the
    /// "process emphasis" step of CommonMark does.
    private static func processEmphasis(_ nodes: inout [Node]) {
        var closer = 0
        while closer < nodes.count {
            let close = nodes[closer]
            guard let char = close.delimiter, close.canClose, close.count > 0 else {
                closer += 1
                continue
            }
            var opener = closer - 1
            var found = false
            while opener >= 0 {
                let open = nodes[opener]
                if open.delimiter == char, open.canOpen, open.count > 0 {
                    found = true
                    break
                }
                opener -= 1
            }
            guard found else {
                closer += 1
                continue
            }
            let open = nodes[opener]
            let used: Int
            let mark: WriteMarks
            if char == "~" {
                used = 2
                mark = .strike
            } else if open.count >= 2, close.count >= 2 {
                used = 2
                mark = .bold
            } else {
                used = 1
                mark = .italic
            }
            for index in (opener + 1)..<closer {
                nodes[index].marks.insert(mark)
                // A delimiter between the pair can no longer match.
                if nodes[index].delimiter != nil {
                    nodes[index].canOpen = false
                    nodes[index].canClose = false
                }
            }
            open.count -= used
            close.count -= used
            if close.count == 0 { closer += 1 }
        }
    }

    private static func isLeftFlanking(before: Character?, after: Character?) -> Bool {
        guard let after, !after.isWhitespace else { return false }
        if !isPunctuation(after) { return true }
        guard let before else { return true }
        return before.isWhitespace || isPunctuation(before)
    }

    private static func isPunctuation(_ char: Character?) -> Bool {
        guard let char else { return false }
        return char.isPunctuation || char.isSymbol
    }

    // MARK: - Code and links

    /// A code span that starts at `start`, and the index after it.
    private static func codeSpan(_ chars: [Character], at start: Int) -> (String, Int)? {
        var open = start
        while open < chars.count, chars[open] == "`" { open += 1 }
        let length = open - start
        var i = open
        while i < chars.count {
            guard chars[i] == "`" else {
                i += 1
                continue
            }
            var end = i
            while end < chars.count, chars[end] == "`" { end += 1 }
            if end - i == length {
                var code = String(chars[open..<i])
                if code.count >= 2, code.first == " ", code.last == " ", code.contains(where: { $0 != " " }) {
                    code = String(code.dropFirst().dropLast())
                }
                return (code, end)
            }
            i = end
        }
        return nil
    }

    /// `[[target]]` or `[[target|alias]]`.
    private static func wikiLink(_ chars: [Character], at start: Int) -> (WriteRun, Int)? {
        guard start + 1 < chars.count, chars[start + 1] == "[" else { return nil }
        var i = start + 2
        while i + 1 < chars.count {
            if chars[i] == "]", chars[i + 1] == "]" {
                let inner = String(chars[(start + 2)..<i])
                guard !inner.isEmpty, !inner.contains("["), !inner.contains(lineSeparator) else { return nil }
                let parts = inner.split(separator: "|", maxSplits: 1, omittingEmptySubsequences: false)
                let target = String(parts[0])
                let alias = parts.count > 1 ? String(parts[1]) : target
                guard !target.isEmpty, !alias.isEmpty else { return nil }
                return (WriteRun(alias, link: .wiki(target: target)), i + 2)
            }
            if chars[i] == "]" { return nil }
            i += 1
        }
        return nil
    }

    /// `[text](url)` with no title. The text can hold marks.
    private static func webLink(_ chars: [Character], at start: Int) -> ([Character], String, Int)? {
        var i = start + 1
        var depth = 0
        while i < chars.count {
            let c = chars[i]
            if c == "\\" {
                i += 2
                continue
            }
            if c == "[" { depth += 1 }
            if c == "]" {
                if depth == 0 { break }
                depth -= 1
            }
            i += 1
        }
        guard i < chars.count, i + 1 < chars.count, chars[i + 1] == "(" else { return nil }
        let inner = Array(chars[(start + 1)..<i])
        guard !inner.isEmpty else { return nil }
        var end = i + 2
        while end < chars.count, chars[end] != ")" {
            if chars[end].isWhitespace || chars[end] == "(" { return nil }
            end += 1
        }
        guard end < chars.count else { return nil }
        let url = String(chars[(i + 2)..<end])
        guard !url.isEmpty else { return nil }
        return (inner, url, end + 1)
    }
}
