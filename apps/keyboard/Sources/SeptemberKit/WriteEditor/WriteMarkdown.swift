import Foundation

/// A Markdown document as the blocks of the native Write editor.
public struct WriteMarkdownDocument: Equatable, Sendable {
    public var blocks: [WriteBlock]
}

/// Reads a Markdown file into blocks and writes blocks back to Markdown.
///
/// A block that still matches its source saves as that source, byte for
/// byte. A block that the user edited saves with the rules of the Piper
/// editor: `#` headings, `-` bullets, renumbered lists, `- [ ]` tasks,
/// fenced code, `---` rules, `**`, `*`, `~~`, and backticks for the marks.
/// The serializer never escapes text.
public enum WriteMarkdown {
    public static func parse(_ text: String) -> WriteMarkdownDocument {
        WriteMarkdownDocument(blocks: BlockParser(text).blocks())
    }

    public static func serialize(_ blocks: [WriteBlock]) -> String {
        var out = ""
        var list = ListState()
        for (index, block) in blocks.enumerated() {
            if index == 0 {
                if let source = block.source, source.index == 0 { out += source.lead }
            } else {
                out += separator(blocks[index - 1], block)
            }
            if block.kind.listDepth == nil { list = ListState() }
            if isUnchanged(block), let source = block.source {
                list.note(block.kind)
                out += source.text
            } else {
                out += render(block, list: &list)
            }
        }
        out += ending(blocks)
        return out
    }

    /// True when the source of the block still reads as the block.
    static func isUnchanged(_ block: WriteBlock) -> Bool {
        guard let source = block.source else { return false }
        if source.text.isEmpty { return block.kind == .paragraph && block.text.isEmpty }
        guard let parsed = BlockParser(source.text).blocks().first else { return false }
        return parsed.kind == block.kind && parsed.normalizedRuns == block.normalizedRuns
    }

    // MARK: - Between blocks

    private static func separator(_ previous: WriteBlock, _ block: WriteBlock) -> String {
        if let a = previous.source, let b = block.source, b.index == a.index + 1 { return a.gap }
        return sameList(previous.kind, block.kind) ? "\n" : "\n\n"
    }

    private static func sameList(_ a: WriteBlockKind, _ b: WriteBlockKind) -> Bool {
        guard let depthA = a.listDepth, let depthB = b.listDepth else { return false }
        if depthA != depthB { return true }
        switch (a, b) {
        case (.ordered, .ordered): return true
        case (.ordered, _), (_, .ordered): return false
        default: return true
        }
    }

    private static func ending(_ blocks: [WriteBlock]) -> String {
        guard let last = blocks.last else { return "" }
        if let source = last.source, source.isLast { return source.gap }
        return blocks.lazy.compactMap(\.source).first?.trailing ?? ""
    }

    // MARK: - One block

    /// The marker widths and the numbers of the open list items, by depth.
    struct ListState {
        var widths: [Int] = []
        var numbers: [Int?] = []

        mutating func note(_ kind: WriteBlockKind) {
            _ = marker(kind)
        }

        /// The marker of a list item, with the number that follows the item
        /// before it at the same depth.
        mutating func marker(_ kind: WriteBlockKind) -> (indent: String, marker: String) {
            guard let depth = kind.listDepth else { return ("", "") }
            while widths.count < depth { widths.append(2) }
            while numbers.count < depth { numbers.append(nil) }
            widths = Array(widths.prefix(depth))
            let indent = String(repeating: " ", count: widths.reduce(0, +))
            let previous = numbers.count > depth ? numbers[depth] : nil
            numbers = Array(numbers.prefix(depth))
            let marker: String
            switch kind {
            case .ordered(let number, _):
                let value = previous.map { $0 + 1 } ?? number
                numbers.append(value)
                marker = "\(value). "
            case .task(let checked, _):
                numbers.append(nil)
                marker = checked ? "- [x] " : "- [ ] "
            default:
                numbers.append(nil)
                marker = "- "
            }
            widths.append(kind.isTask ? 2 : marker.count)
            return (indent, marker)
        }
    }

    private static func render(_ block: WriteBlock, list: inout ListState) -> String {
        let text = block.kind.isLiteral ? block.text : inline(block.normalizedRuns)
        let lines = text.split(separator: lineSeparator, omittingEmptySubsequences: false).map(String.init)
        switch block.kind {
        case .paragraph:
            return lines.joined(separator: "  \n")
        case .heading(let level):
            return String(repeating: "#", count: level) + " " + lines.joined(separator: " ")
        case .bullet, .ordered, .task:
            let (indent, marker) = list.marker(block.kind)
            let rest = String(repeating: " ", count: indent.count + marker.count)
            return indent + marker + lines.joined(separator: "  \n" + rest)
        case .quote:
            return lines.map { $0.isEmpty ? ">" : "> " + $0 }.joined(separator: "\n")
        case .code(let language):
            let longest = longestRun(of: "`", in: text)
            let fence = String(repeating: "`", count: max(3, longest + 1))
            return fence + language + "\n" + lines.joined(separator: "\n") + "\n" + fence
        case .rule:
            return "---"
        case .raw:
            return lines.joined(separator: "\n")
        }
    }

    /// The Markdown of a run list. Spaces at the edge of a mark go outside it.
    static func inline(_ runs: [WriteRun]) -> String {
        var out = ""
        var open: [WriteMarks] = []
        var pending = ""
        let order: [WriteMarks] = [.bold, .italic, .strike]

        func close(to marks: WriteMarks) {
            while let last = open.last, !marks.contains(last) || open.contains(where: { !marks.contains($0) }) {
                out += delimiter(last)
                open.removeLast()
            }
        }

        var index = 0
        while index < runs.count {
            let run = runs[index]
            if let link = run.link {
                // A link is one group of runs with the same target.
                var group: [WriteRun] = []
                while index < runs.count, runs[index].link == link {
                    var inner = runs[index]
                    inner.link = nil
                    group.append(inner)
                    index += 1
                }
                close(to: [])
                out += pending
                pending = ""
                let label = inline(group)
                switch link {
                case .url(let url):
                    out += "[" + label + "](" + url + ")"
                case .wiki(let target):
                    let shown = group.map(\.text).joined()
                    out += shown == target ? "[[" + target + "]]" : "[[" + target + "|" + shown + "]]"
                }
                continue
            }
            index += 1
            let marks = run.marks.subtracting(.code)
            var core = run.text
            var lead = ""
            var trail = ""
            if !run.marks.contains(.code) {
                lead = String(core.prefix { $0 == " " })
                core.removeFirst(lead.count)
                trail = String(core.reversed().prefix { $0 == " " })
                core.removeLast(trail.count)
            }
            if core.isEmpty {
                pending += lead + trail
                continue
            }
            close(to: marks)
            out += pending + lead
            pending = trail
            for mark in order where marks.contains(mark) && !open.contains(mark) {
                out += delimiter(mark)
                open.append(mark)
            }
            out += run.marks.contains(.code) ? codeSpan(core) : core
        }
        close(to: [])
        return out + pending
    }

    private static func delimiter(_ mark: WriteMarks) -> String {
        switch mark {
        case .bold: "**"
        case .italic: "*"
        default: "~~"
        }
    }

    private static func codeSpan(_ text: String) -> String {
        let fence = String(repeating: "`", count: longestRun(of: "`", in: text) + 1)
        let pad = text.hasPrefix("`") || text.hasSuffix("`") ? " " : ""
        return fence + pad + text + pad + fence
    }

    private static func longestRun(of char: Character, in text: String) -> Int {
        var longest = 0
        var current = 0
        for c in text {
            current = c == char ? current + 1 : 0
            longest = max(longest, current)
        }
        return longest
    }
}

extension WriteBlockKind {
    var isTask: Bool {
        if case .task = self { return true }
        return false
    }
}

// MARK: - Block parser

/// Reads the lines of a file into blocks, and keeps the source of each block.
private struct BlockParser {
    let lines: [String]
    let endsWithNewline: Bool

    init(_ text: String) {
        var lines = text.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        endsWithNewline = text.hasSuffix("\n")
        if endsWithNewline { lines.removeLast() }
        self.lines = lines
    }

    private struct Found {
        var kind: WriteBlockKind
        var text: String
        var start: Int
        var end: Int  // exclusive
        var literal = false
    }

    func blocks() -> [WriteBlock] {
        var found: [Found] = []
        var i = 0
        var blankRun: [Int] = []
        while i < lines.count {
            if isBlank(lines[i]) {
                blankRun.append(i)
                i += 1
                continue
            }
            // Blank lines past the first make empty paragraphs, two lines each.
            if !found.isEmpty, blankRun.count >= 3 {
                let empties = (blankRun.count - 1) / 2
                for n in 0..<empties {
                    let line = blankRun[1 + 2 * n]
                    found.append(Found(kind: .paragraph, text: "", start: line, end: line))
                }
            }
            blankRun = []
            let block = next(at: i, isFirst: found.isEmpty && i == 0)
            found.append(block)
            i = block.end
        }
        return assemble(found)
    }

    /// Turns the found blocks into blocks with their source and gaps.
    private func assemble(_ found: [Found]) -> [WriteBlock] {
        let all = lines.joined(separator: "\n") + (endsWithNewline ? "\n" : "")
        let offsets = lineOffsets()
        func offset(_ line: Int) -> Int { line < offsets.count ? offsets[line] : all.utf16.count }
        func slice(_ from: Int, _ to: Int) -> String {
            let utf16 = all.utf16
            let a = utf16.index(utf16.startIndex, offsetBy: from)
            let b = utf16.index(utf16.startIndex, offsetBy: max(from, to))
            return String(all[a..<b])
        }
        /// The end of the text of a block: the end of its last line.
        func endOffset(_ block: Found) -> Int {
            block.end == block.start ? offset(block.start) : offset(block.end - 1) + lines[block.end - 1].utf16.count
        }
        let lastEnd = found.last.map(endOffset) ?? 0
        let trailing = slice(lastEnd, all.utf16.count)
        let lead = found.first.map { slice(0, offset($0.start)) } ?? ""

        return found.enumerated().map { index, block in
            let start = offset(block.start)
            let end = endOffset(block)
            let nextStart = index + 1 < found.count ? offset(found[index + 1].start) : all.utf16.count
            let source = WriteSource(
                text: slice(start, end), index: index, gap: slice(end, nextStart), lead: lead,
                isLast: index == found.count - 1, trailing: trailing)
            let runs =
                block.literal || block.kind.isLiteral
                ? (block.text.isEmpty ? [] : [WriteRun(block.text)])
                : WriteInlineParser.runs(block.text)
            return WriteBlock(kind: block.kind, runs: runs, source: source)
        }
    }

    private func lineOffsets() -> [Int] {
        var offsets: [Int] = []
        var offset = 0
        for line in lines {
            offsets.append(offset)
            offset += line.utf16.count + 1
        }
        return offsets
    }

    // MARK: Block starts

    private func next(at i: Int, isFirst: Bool) -> Found {
        let line = lines[i]
        if isFirst, line == "---", let close = lines.indices.dropFirst().first(where: { lines[$0] == "---" || lines[$0] == "..." }) {
            return raw(from: i, to: close + 1)
        }
        if let fence = fenceOpen(line) {
            return code(at: i, fence: fence)
        }
        if let (level, text) = atxHeading(line) {
            return Found(kind: .heading(level), text: text, start: i, end: i + 1)
        }
        if isRule(line) {
            return Found(kind: .rule, text: "", start: i, end: i + 1)
        }
        if line.contains("|"), i + 1 < lines.count, isTableSeparator(lines[i + 1]) {
            return raw(from: i, to: endOfRun(from: i))
        }
        if isHTMLStart(line) || isDefinition(line) || isIndentedCode(line) {
            return raw(from: i, to: endOfRun(from: i))
        }
        if quoteLine(line) != nil {
            var end = i
            var texts: [String] = []
            while end < lines.count, let text = quoteLine(lines[end]) {
                texts.append(text)
                end += 1
            }
            return Found(kind: .quote, text: texts.joined(separator: String(lineSeparator)), start: i, end: end)
        }
        if let item = listItem(line) {
            var end = i + 1
            var texts = [item.text]
            while end < lines.count, !isBlank(lines[end]), !startsBlock(lines[end]), listItem(lines[end]) == nil {
                texts.append(lines[end].trimmingCharacters(in: .whitespaces))
                end += 1
            }
            return Found(kind: item.kind, text: joinLines(texts), start: i, end: end)
        }
        return paragraph(at: i)
    }

    private func paragraph(at i: Int) -> Found {
        var end = i + 1
        var texts = [lines[i].trimmingCharacters(in: .whitespaces)]
        while end < lines.count, !isBlank(lines[end]) {
            let line = lines[end]
            if let level = setextLevel(line) {
                let text = joinLines(texts)
                return Found(kind: .heading(level), text: text.replacingOccurrences(of: String(lineSeparator), with: " "), start: i, end: end + 1)
            }
            if startsBlock(line) { break }
            texts.append(line.trimmingCharacters(in: .whitespaces))
            end += 1
        }
        return Found(kind: .paragraph, text: joinLines(texts), start: i, end: end)
    }

    /// Joins the lines of a block with a line break, and removes the marks of
    /// a hard break: two spaces or a backslash at the end of a line.
    private func joinLines(_ texts: [String]) -> String {
        texts.enumerated().map { index, text in
            guard index < texts.count - 1 else { return text }
            if text.hasSuffix("\\") { return String(text.dropLast()) }
            var line = text
            while line.hasSuffix(" ") { line.removeLast() }
            return line
        }
        .joined(separator: String(lineSeparator))
    }

    private func code(at i: Int, fence: (char: Character, length: Int, info: String)) -> Found {
        var end = i + 1
        var body: [String] = []
        while end < lines.count {
            let trimmed = lines[end].trimmingCharacters(in: .whitespaces)
            if trimmed.count >= fence.length, trimmed.allSatisfy({ $0 == fence.char }),
                lines[end].prefix(while: { $0 == " " }).count <= 3
            {
                end += 1
                break
            }
            body.append(lines[end])
            end += 1
        }
        let language = String(fence.info.split(separator: " ").first ?? "")
        return Found(
            kind: .code(language: language), text: body.joined(separator: String(lineSeparator)), start: i, end: end,
            literal: true)
    }

    private func raw(from start: Int, to end: Int) -> Found {
        Found(
            kind: .raw, text: lines[start..<end].joined(separator: String(lineSeparator)), start: start, end: end,
            literal: true)
    }

    private func endOfRun(from i: Int) -> Int {
        var end = i + 1
        while end < lines.count, !isBlank(lines[end]) { end += 1 }
        return end
    }

    // MARK: Line tests

    private func isBlank(_ line: String) -> Bool {
        line.allSatisfy { $0 == " " || $0 == "\t" || $0 == "\r" }
    }

    private func indent(_ line: String) -> Int { line.prefix { $0 == " " }.count }

    private func startsBlock(_ line: String) -> Bool {
        if indent(line) > 3 { return false }
        if fenceOpen(line) != nil || atxHeading(line) != nil || isRule(line) || quoteLine(line) != nil
            || isHTMLStart(line)
        {
            return true
        }
        if let item = listItem(line) {
            if case .ordered(let number, _) = item.kind { return number == 1 && !item.text.isEmpty }
            return !item.text.isEmpty
        }
        return false
    }

    private func fenceOpen(_ line: String) -> (char: Character, length: Int, info: String)? {
        guard indent(line) <= 3 else { return nil }
        let rest = line.drop { $0 == " " }
        guard let char = rest.first, char == "`" || char == "~" else { return nil }
        let length = rest.prefix { $0 == char }.count
        guard length >= 3 else { return nil }
        let info = rest.dropFirst(length).trimmingCharacters(in: .whitespaces)
        if char == "`", info.contains("`") { return nil }
        return (char, length, info)
    }

    private func atxHeading(_ line: String) -> (Int, String)? {
        guard indent(line) <= 3 else { return nil }
        let rest = line.drop { $0 == " " }
        let hashes = rest.prefix { $0 == "#" }.count
        guard (1...6).contains(hashes) else { return nil }
        let after = rest.dropFirst(hashes)
        guard after.isEmpty || after.first == " " || after.first == "\t" else { return nil }
        var text = after.trimmingCharacters(in: .whitespaces)
        // A closing run of `#` after a space is not part of the heading.
        if let range = text.range(of: #"(^|\s)#+$"#, options: .regularExpression) {
            text = String(text[..<range.lowerBound])
        }
        return (hashes, text.trimmingCharacters(in: .whitespaces))
    }

    private func isRule(_ line: String) -> Bool {
        guard indent(line) <= 3 else { return false }
        let chars = line.filter { $0 != " " && $0 != "\t" }
        guard chars.count >= 3, let first = chars.first, "-*_".contains(first) else { return false }
        return chars.allSatisfy { $0 == first }
    }

    private func setextLevel(_ line: String) -> Int? {
        guard indent(line) <= 3 else { return nil }
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return nil }
        if trimmed.allSatisfy({ $0 == "=" }) { return 1 }
        if trimmed.allSatisfy({ $0 == "-" }) { return 2 }
        return nil
    }

    private func isTableSeparator(_ line: String) -> Bool {
        line.range(of: #"^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$"#, options: .regularExpression) != nil
            && line.contains("-")
    }

    private func isHTMLStart(_ line: String) -> Bool {
        line.range(of: #"^ {0,3}<([A-Za-z/!?])"#, options: .regularExpression) != nil
    }

    private func isDefinition(_ line: String) -> Bool {
        line.range(of: #"^ {0,3}\[\^?[^\]]+\]:"#, options: .regularExpression) != nil
    }

    private func isIndentedCode(_ line: String) -> Bool {
        line.hasPrefix("    ") || line.hasPrefix("\t")
    }

    private func quoteLine(_ line: String) -> String? {
        guard indent(line) <= 3 else { return nil }
        let rest = line.drop { $0 == " " }
        guard rest.first == ">" else { return nil }
        var text = rest.dropFirst()
        if text.first == " " { text = text.dropFirst() }
        return String(text)
    }

    private func listItem(_ line: String) -> (kind: WriteBlockKind, text: String)? {
        guard
            let match = line.firstMatch(of: /^( *)([-*+]|\d{1,9}[.)])(?: +(.*))?$/)
        else { return nil }
        let spaces = match.1.count
        let marker = String(match.2)
        var text = String(match.3 ?? "")
        // A deeper item is one level deeper for each two spaces.
        let depth = spaces / 2
        if let number = Int(marker.dropLast()), marker.last == "." || marker.last == ")" {
            return (.ordered(number: number, depth: depth), text)
        }
        if let task = text.firstMatch(of: /^\[([ xX])\](?: +(.*))?$/) {
            let checked = task.1 != " "
            text = String(task.2 ?? "")
            return (.task(checked: checked, depth: depth), text)
        }
        return (.bullet(depth: depth), text)
    }
}
