import Foundation

// The bridge to the Markdown editor page of Piper, `Resources/Editor/editor.html`,
// which holds the editor of Hubble.md. The keyboard calls the functions on
// `window.piper`, and the page sends messages to the `editor` script message
// handler. The page keeps the name `piper`, because the page itself calls it.
//
// The page reports its text only 120 ms after the last edit, and it does not
// report the caret. `EditorCall.pageScript` adds `window.septemberWrite`: after
// each edit, caret move, and change of size, it sends a `state` message with
// the text, the paragraph at the caret, the selection, and the height.

/// A link that the user opened in the editor.
public enum WriteLink: Hashable, Sendable {
    /// A `[[` link to another document, by its title.
    case wiki(target: String)
    /// A web or mail link, as the page gives it.
    case url(String)
}

/// The reading look of the editor page.
public struct EditorTheme: Encodable, Equatable, Sendable {
    /// `Paper`, `Sepia`, or `Slate`.
    public let theme: String
    /// `Serif`, `Sans Serif`, or `Monospace`.
    public let font: String
    public let size: Double
    /// `System`, `Light`, or `Dark`.
    public let appearance: String

    /// The look of the Write paper. It follows the system appearance.
    public static let write = EditorTheme(
        theme: "Paper", font: "Serif", size: Metrics.WriteEditor.textSize, appearance: "System")
}

/// The document that the editor page shows.
public struct EditorOpenRequest: Encodable, Equatable, Sendable {
    /// The name of this open in the page.
    public let path: String
    public let text: String
    /// `rich` for the formatted editor, `source` for plain Markdown.
    public let mode: String

    public init(path: String, text: String, mode: String) {
        self.path = path
        self.text = text
        self.mode = mode
    }

    enum CodingKeys: String, CodingKey {
        case path, text, editable, mode, wikiTargets, header, title, anchor
    }

    /// The page reads every field. The paper shows no byline and no title.
    public func encode(to encoder: any Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(path, forKey: .path)
        try container.encode(text, forKey: .text)
        try container.encode(true, forKey: .editable)
        try container.encode(mode, forKey: .mode)
        try container.encode([String](), forKey: .wikiTargets)
        try container.encode("", forKey: .header)
        try container.encodeNil(forKey: .title)
        try container.encodeNil(forKey: .anchor)
    }
}

/// A call from the keyboard to the page.
public enum EditorCall: Equatable, Sendable {
    /// Shows a document with a new undo history. `number` counts the opens,
    /// so that the keyboard can drop a state of an earlier document.
    case open(EditorOpenRequest, number: Int)
    case theme(EditorTheme)
    /// Selects the text of the first heading, for Rename.
    case selectTitle

    /// The JavaScript that makes the call.
    public var script: String {
        switch self {
        case .open(let request, let number):
            "window.piper.open(\(Self.json(request)));window.septemberWrite.opened(\(number))"
        case .theme(let theme):
            "window.piper.theme(\(Self.json(theme)))"
        case .selectTitle:
            "window.septemberWrite.selectTitle()"
        }
    }

    private static func json(_ value: some Encodable) -> String {
        // The values are strings, numbers, and flags, which always encode.
        let data = (try? JSONEncoder().encode(value)) ?? Data("null".utf8)
        return String(decoding: data, as: UTF8.self)
    }

    /// The script that the keyboard adds to the page at the end of its load.
    ///
    /// It adds `css`, the look of the paper (`WriteEditorStyle`). The height
    /// is the bottom of the last block plus `bottom`, so that the paper can be
    /// shorter than the web view.
    /// The offsets of the caret are UTF-16 units, the same as the
    /// accessibility API.
    public static func pageScript(bottom: Double, css: String) -> String {
        """
        (() => {
          const style = document.createElement("style");
          style.textContent = \(json(css));
          document.head.appendChild(style);

          let open = 0;
          let queued = false;
          const post = (message) => window.webkit?.messageHandlers?.editor?.postMessage(message);
          const editorElement = () => document.querySelector('[contenteditable="true"]');
          const scroller = (element) => {
            for (let node = element; node; node = node.parentElement) {
              const overflow = getComputedStyle(node).overflowY;
              if (overflow === "auto" || overflow === "scroll") return node;
            }
            return document.scrollingElement;
          };

          const caretOf = (editor) => {
            const selection = document.getSelection();
            if (!selection || selection.rangeCount === 0 || !selection.focusNode) return null;
            if (!editor.contains(selection.focusNode)) return null;
            const node = selection.focusNode.nodeType === 1
              ? selection.focusNode : selection.focusNode.parentElement;
            const block = node.closest("p, h1, h2, h3, h4, h5, h6, pre, th, td") || editor;
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
          };

          const selectedText = (editor) => {
            const selection = document.getSelection();
            const inside = selection && !selection.isCollapsed
              && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode);
            return inside ? selection.toString() : "";
          };

          const heightOf = (editor) => {
            const box = scroller(editor);
            const last = editor.lastElementChild ?? editor;
            const top = box === document.scrollingElement ? 0 : box.getBoundingClientRect().top;
            return last.getBoundingClientRect().bottom - top + box.scrollTop + \(bottom);
          };

          const report = () => {
            queued = false;
            const editor = editorElement();
            if (!editor || !window.piper) return;
            post({
              action: "state", open, text: window.piper.flush() ?? "",
              caret: caretOf(editor), selection: selectedText(editor),
              empty: editor.textContent.trim() === "", height: heightOf(editor),
            });
          };
          const queue = () => {
            if (queued) return;
            queued = true;
            setTimeout(report, 16);
          };

          document.addEventListener("selectionchange", queue);
          document.addEventListener("input", queue, true);
          new ResizeObserver(queue).observe(document.body);
          new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, characterData: true });

          window.septemberWrite = {
            opened(number) {
              open = number;
              queue();
            },
            selectTitle() {
              const editor = editorElement();
              const title = editor?.querySelector("h1, h2, h3, h4, h5, h6");
              if (!editor || !title) return;
              editor.focus();
              const range = document.createRange();
              range.selectNodeContents(title);
              const selection = document.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
            },
          };
        })();
        """
    }
}

/// What the page reports after an edit, a caret move, or a change of size.
public struct EditorPageState: Equatable, Sendable {
    /// The number of the open that the state belongs to.
    public let open: Int
    /// The Markdown of the document.
    public let text: String
    /// The paragraph at the caret, or nil when the caret is not in the editor.
    public let caret: EditorCaret?
    /// The selected text of the page, with no Markdown marks, or empty.
    public let selection: String
    /// The height of the text with the margins of the paper.
    public let height: Double

    public init(open: Int, text: String, caret: EditorCaret?, selection: String, height: Double) {
        self.open = open
        self.text = text
        self.caret = caret
        self.selection = selection
        self.height = height
    }
}

/// A message from the editor page.
///
/// The page also sends messages for the features of Piper that the keyboard
/// does not use, such as images, reader notes, copy, and the delayed
/// `change`. Those are `unused`, and the keyboard answers them with nothing.
public enum EditorMessage: Equatable, Sendable {
    /// The page loaded and can take calls.
    case ready
    case state(EditorPageState)
    case link(WriteLink)
    /// The rich editor would lose these parts of the document, so it does not
    /// edit it.
    case lossy([String])
    case unused

    public init(body: Any) {
        guard let body = body as? [String: Any], let action = body["action"] as? String else {
            self = .unused
            return
        }
        switch action {
        case "ready":
            self = .ready
        case "state":
            // WebKit gives each number as an NSNumber.
            guard let open = (body["open"] as? NSNumber)?.intValue, let text = body["text"] as? String,
                let selection = body["selection"] as? String,
                let height = (body["height"] as? NSNumber)?.doubleValue
            else {
                self = .unused
                return
            }
            let empty = body["empty"] as? Bool ?? false
            var caret: EditorCaret?
            if let place = body["caret"] as? [String: Any], let paragraph = place["text"] as? String,
                let offset = (place["caret"] as? NSNumber)?.intValue,
                let length = (place["length"] as? NSNumber)?.intValue
            {
                caret = EditorCaret(text: paragraph, caret: offset, length: length, documentIsEmpty: empty)
            } else if empty {
                caret = EditorCaret(text: "", caret: 0, length: 0, documentIsEmpty: true)
            }
            self = .state(EditorPageState(open: open, text: text, caret: caret, selection: selection, height: height))
        case "link":
            guard let target = body["target"] as? String else {
                self = .unused
                return
            }
            self = .link(body["kind"] as? String == "wiki" ? .wiki(target: target) : .url(target))
        case "lossy":
            self = .lossy(body["reasons"] as? [String] ?? [])
        default:
            self = .unused
        }
    }
}
