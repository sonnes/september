import Foundation

// The bridge to the Markdown editor page of Piper, `editor.html`. The keyboard
// calls the functions on `window.piper`, and the page sends messages to the
// `editor` script message handler. The page keeps the name `piper`, because
// the page itself calls it.

/// The reading look of the editor page.
public struct EditorTheme: Encodable, Equatable, Sendable {
    /// `Paper`, `Sepia`, or `Slate`.
    public let theme: String
    /// `Serif`, `Sans Serif`, or `Monospace`.
    public let font: String
    public let size: Double
    /// `System`, `Light`, or `Dark`.
    public let appearance: String

    public init(theme: String, font: String, size: Double, appearance: String) {
        self.theme = theme
        self.font = font
        self.size = size
        self.appearance = appearance
    }

    /// The look of the Write window. It follows the system appearance.
    public static let september = EditorTheme(
        theme: "Paper", font: "Sans Serif", size: Metrics.writeEditorTextSize, appearance: "System")
}

/// The file that the editor page shows.
public struct EditorOpenRequest: Encodable, Equatable, Sendable {
    /// A document that `[[` can link to.
    public struct WikiTarget: Encodable, Equatable, Sendable {
        public let path: String
        public let target: String
        public let title: String

        public init(path: String, target: String, title: String) {
            self.path = path
            self.target = target
            self.title = title
        }
    }

    /// The name of this open in the page. The `change` messages carry it back.
    public let path: String
    public let text: String
    public let editable: Bool
    /// `rich` for the formatted editor, `source` for plain Markdown.
    public let mode: String
    public let wikiTargets: [WikiTarget]
    /// The byline over the text.
    public let header: String
    /// The title over a text with no heading. The Write window shows none.
    public let title: String?
    public let anchor: String?

    public init(path: String, text: String, header: String, wikiTargets: [WikiTarget]) {
        self.path = path
        self.text = text
        self.editable = true
        self.mode = "rich"
        self.wikiTargets = wikiTargets
        self.header = header
        self.title = nil
        self.anchor = nil
    }

    enum CodingKeys: String, CodingKey {
        case path, text, editable, mode, wikiTargets, header, title, anchor
    }

    /// The page reads `null`, so an empty value is written, not left out.
    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(path, forKey: .path)
        try container.encode(text, forKey: .text)
        try container.encode(editable, forKey: .editable)
        try container.encode(mode, forKey: .mode)
        try container.encode(wikiTargets, forKey: .wikiTargets)
        try container.encode(header, forKey: .header)
        try container.encode(title, forKey: .title)
        try container.encode(anchor, forKey: .anchor)
    }
}

/// A call from the keyboard to `window.piper`.
public enum EditorCall: Equatable, Sendable {
    /// Shows a document, with a new undo history.
    case open(EditorOpenRequest)
    /// Puts new text into the open document with no undo step.
    case replace(String)
    /// Changes the byline and the title.
    case header(String, String?)
    case theme(EditorTheme)
    /// Runs an editor command. The page knows `find`.
    case command(String)

    /// Returns the current text of the open document, or null.
    public static let flushScript = "window.piper.flush()"

    /// Returns the paragraph at the caret as an `EditorCaret`, or null when
    /// the editor has no selection. The keyboard cannot read its own web view
    /// through the accessibility API, so the input bar reads it here.
    public static let caretScript = """
        (() => {
          const selection = document.getSelection();
          if (!selection || selection.rangeCount === 0 || !selection.focusNode) return null;
          const editor = document.querySelector('[contenteditable="true"]');
          if (!editor || !editor.contains(selection.focusNode)) return null;
          const node = selection.focusNode.nodeType === 1
            ? selection.focusNode : selection.focusNode.parentElement;
          const block = node.closest('p, h1, h2, h3, h4, h5, h6, pre, th, td') || editor;
          const offset = (container, at) => {
            if (!block.contains(container)) return null;
            const range = document.createRange();
            range.selectNodeContents(block);
            range.setEnd(container, at);
            return range.toString().length;
          };
          const focus = offset(selection.focusNode, selection.focusOffset);
          const anchor = offset(selection.anchorNode, selection.anchorOffset);
          const start = anchor === null ? focus : Math.min(anchor, focus);
          const end = anchor === null ? focus : Math.max(anchor, focus);
          return { text: block.textContent, caret: start, length: end - start };
        })()
        """

    /// Returns an `EditorSpeech`: the selected text, and the Markdown of the
    /// open document. The selection is the text of the page, so it holds no
    /// Markdown marks. A selection that leaves the editor counts as none.
    public static let speechScript = """
        (() => {
          const selection = document.getSelection();
          const editor = document.querySelector('[contenteditable="true"]');
          const inEditor = selection && editor && !selection.isCollapsed
            && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode);
          return { selection: inEditor ? selection.toString() : "", markdown: window.piper.flush() ?? "" };
        })()
        """

    /// The JavaScript that makes the call.
    public var script: String {
        switch self {
        case .open(let request): Self.call("open", request)
        case .replace(let text): Self.call("replace", text)
        case .header(let header, let title): Self.call("header", arguments: [header, title])
        case .theme(let theme): Self.call("theme", theme)
        case .command(let name): Self.call("command", name)
        }
    }

    private static func call(_ function: String, _ value: some Encodable) -> String {
        "window.piper.\(function)(\(json(value)))"
    }

    private static func call(_ function: String, arguments: [String?]) -> String {
        "window.piper.\(function)(\(json(arguments).dropFirst().dropLast()))"
    }

    private static func json(_ value: some Encodable) -> String {
        // The values are strings, numbers, and flags, which always encode.
        let data = (try? JSONEncoder().encode(value)) ?? Data("null".utf8)
        return String(decoding: data, as: UTF8.self)
    }
}

/// A message from the editor page.
///
/// The page also sends messages for the features of Piper that the keyboard
/// does not use, such as images, reader notes, and copy. Those are `unused`,
/// and the keyboard answers them with nothing.
public enum EditorMessage: Equatable, Sendable {
    /// The page loaded and can take calls.
    case ready
    /// The text of an open, 120 ms after the last edit.
    case change(path: String, text: String)
    /// A `[[` link to another document, by its title.
    case wikiLink(String)
    /// A link to a web page or an email address.
    case webLink(URL)
    case unused

    public init(body: Any) {
        guard let body = body as? [String: Any], let action = body["action"] as? String else {
            self = .unused
            return
        }
        switch action {
        case "ready":
            self = .ready
        case "change":
            guard let path = body["path"] as? String, let text = body["text"] as? String else {
                self = .unused
                return
            }
            self = .change(path: path, text: text)
        case "link":
            guard let target = body["target"] as? String else {
                self = .unused
                return
            }
            if body["kind"] as? String == "wiki" {
                self = .wikiLink(target)
            } else if let url = URL(string: target),
                ["http", "https", "mailto"].contains(url.scheme?.lowercased() ?? "")
            {
                self = .webLink(url)
            } else {
                self = .unused
            }
        default:
            self = .unused
        }
    }
}

/// The paragraph at the caret of the editor, from `EditorCall.caretScript`.
/// The offsets are UTF-16 units, the same as the accessibility API.
public struct EditorCaret: Decodable, Equatable, Sendable {
    public let text: String
    public let caret: Int
    public let length: Int

    public init(text: String, caret: Int, length: Int) {
        self.text = text
        self.caret = caret
        self.length = length
    }

    /// The paragraph as a focused field, for `KeyboardController.focusChanged(to:)`.
    public var focusedField: FocusedField {
        FocusedField(
            appName: "Write", role: "AXTextArea", isEditable: true, isSecure: false,
            text: text, selection: NSRange(location: caret, length: length))
    }
}

/// What Speak reads in the Write window, from `EditorCall.speechScript`.
public struct EditorSpeech: Decodable, Equatable, Sendable {
    /// The selected text of the page, or empty.
    public let selection: String
    /// The Markdown of the open document.
    public let markdown: String

    public init(selection: String, markdown: String) {
        self.selection = selection
        self.markdown = markdown
    }

    /// The selection, or the whole document without its Markdown marks when
    /// nothing is selected. `nil` when there is nothing to read.
    public var text: String? {
        let selected = selection.trimmingCharacters(in: .whitespacesAndNewlines)
        let text = selected.isEmpty ? MarkdownSpeech.plainText(markdown) : selected
        return text.isEmpty ? nil : text
    }
}
