import Foundation

/// The inline marks of a run of text in the native Write editor.
public struct WriteMarks: OptionSet, Hashable, Sendable {
    public let rawValue: Int
    public init(rawValue: Int) { self.rawValue = rawValue }

    public static let bold = WriteMarks(rawValue: 1)
    public static let italic = WriteMarks(rawValue: 2)
    public static let strike = WriteMarks(rawValue: 4)
    public static let code = WriteMarks(rawValue: 8)
}

/// The target of a link. A web link opens in the browser. A wiki link
/// (`[[Title]]`) opens the document with that title.
public enum WriteLink: Hashable, Sendable {
    case url(String)
    case wiki(target: String)
}

/// A run of text with one set of marks and at most one link.
public struct WriteRun: Equatable, Sendable {
    public var text: String
    public var marks: WriteMarks
    public var link: WriteLink?

    public init(_ text: String, marks: WriteMarks = [], link: WriteLink? = nil) {
        self.text = text
        self.marks = marks
        self.link = link
    }
}

/// The kind of a block. A block is one paragraph of the editor. A list
/// item is one block, with its depth in the list.
public enum WriteBlockKind: Hashable, Sendable {
    case paragraph
    case heading(Int)
    case bullet(depth: Int)
    case ordered(number: Int, depth: Int)
    case task(checked: Bool, depth: Int)
    case quote
    case code(language: String)
    case rule
    /// Markdown that the editor does not show as rich text, such as a table,
    /// HTML, or front matter. The editor shows its source.
    case raw

    /// The depth of a list item, or nil for a block that is not a list item.
    public var listDepth: Int? {
        switch self {
        case .bullet(let depth), .ordered(_, let depth), .task(_, let depth): depth
        default: nil
        }
    }

    /// True for a block whose text has no inline marks.
    public var isLiteral: Bool {
        switch self {
        case .code, .raw, .rule: true
        default: false
        }
    }

    /// The same kind at another list depth. A block that is not a list item
    /// does not change.
    public func withDepth(_ depth: Int) -> WriteBlockKind {
        switch self {
        case .bullet: .bullet(depth: depth)
        case .ordered(let number, _): .ordered(number: number, depth: depth)
        case .task(let checked, _): .task(checked: checked, depth: depth)
        default: self
        }
    }
}

/// Where a block came from in the file. A block that still matches its source
/// saves as that source, so a save changes only the blocks that the user
/// edited.
public struct WriteSource: Equatable, Sendable {
    /// The Markdown of the block, without the line break at its end.
    public let text: String
    /// The kind of the block in the file.
    public let kind: WriteBlockKind
    /// The place of the block in the file, from 0.
    public let index: Int
    /// The text between the block and the next block, or the end of the file.
    public let gap: String
    /// The text before the first block. Only the first block uses it.
    public let lead: String
    /// True for the last block of the file.
    public let isLast: Bool
    /// The text after the last block of the file.
    public let trailing: String

    public init(
        text: String, kind: WriteBlockKind, index: Int, gap: String, lead: String, isLast: Bool, trailing: String
    ) {
        self.text = text
        self.kind = kind
        self.index = index
        self.gap = gap
        self.lead = lead
        self.isLast = isLast
        self.trailing = trailing
    }
}

/// One block of a Markdown document: its kind, its runs of text, and its
/// source in the file.
///
/// The text has no Markdown marks. A line break inside a block is U+2028, so
/// that the block stays one paragraph in the text view.
public struct WriteBlock: Equatable, Sendable {
    public var kind: WriteBlockKind
    public var runs: [WriteRun]
    public var source: WriteSource?

    public init(kind: WriteBlockKind, runs: [WriteRun], source: WriteSource? = nil) {
        self.kind = kind
        self.runs = runs
        self.source = source
    }

    public init(kind: WriteBlockKind, text: String, source: WriteSource? = nil) {
        self.init(kind: kind, runs: text.isEmpty ? [] : [WriteRun(text)], source: source)
    }

    /// The text of the block, with no marks.
    public var text: String { runs.map(\.text).joined() }

    /// The runs with empty runs removed and neighbours with the same marks
    /// and link joined.
    public var normalizedRuns: [WriteRun] {
        var result: [WriteRun] = []
        for run in runs where !run.text.isEmpty {
            if let last = result.last, last.marks == run.marks, last.link == run.link {
                result[result.count - 1].text += run.text
            } else {
                result.append(run)
            }
        }
        return result
    }
}

/// The line break inside a block.
let lineSeparator: Character = "\u{2028}"
