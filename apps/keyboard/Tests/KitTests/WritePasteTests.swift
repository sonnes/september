import AppKit
import SeptemberKit

@MainActor
func writePasteTests() {
    func pasteboard(html: String? = nil, rtf: NSAttributedString? = nil, plain: String? = nil) -> NSPasteboard {
        let board = NSPasteboard(name: NSPasteboard.Name("september-paste-\(UUID().uuidString)"))
        board.clearContents()
        if let html { board.setString(html, forType: .html) }
        if let rtf {
            let data = try? rtf.data(
                from: NSRange(location: 0, length: rtf.length), documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf])
            board.setData(data, forType: .rtf)
        }
        if let plain { board.setString(plain, forType: .string) }
        return board
    }
    func editor(_ markdown: String = "") -> WriteTextView {
        let view = WriteTextView(frame: NSRect(x: 0, y: 0, width: 640, height: 800))
        view.load(markdown)
        return view
    }

    test("HTML marks become Markdown marks and links") {
        let board = pasteboard(
            html: #"<p>Say <b>hello</b> and <i>bye</i> to <a href="https://a.com/x">Ann</a> and <s>no</s></p>"#,
            plain: "Say hello and bye to Ann and no")
        expectEqual(WritePaste.markdown(from: board), "Say **hello** and *bye* to [Ann](https://a.com/x) and ~~no~~")
    }

    test("HTML headings and lists become Markdown blocks") {
        let board = pasteboard(
            html: "<h1>Plans</h1><p>Body</p><ul><li>one</li><li>two</li></ul><ol><li>first</li><li>second</li></ol>",
            plain: "Plans\nBody\none\ntwo")
        expectEqual(WritePaste.markdown(from: board), "# Plans\n\nBody\n\n- one\n- two\n\n1. first\n2. second")
    }

    test("RTF marks become Markdown marks") {
        let body = NSFont(name: "Helvetica", size: 12)!
        let bold = NSFontManager.shared.convert(body, toHaveTrait: .boldFontMask)
        let rich = NSMutableAttributedString(string: "Buy ", attributes: [.font: body])
        rich.append(NSAttributedString(string: "milk", attributes: [.font: bold]))
        expectEqual(WritePaste.markdown(from: pasteboard(rtf: rich, plain: "Buy milk")), "Buy **milk**")
    }

    test("rich text that is all monospace pastes its plain text, as code editors copy Markdown source") {
        let board = pasteboard(
            html: #"<pre style="font-family: Menlo"><span style="color: red"># Title</span></pre>"#,
            plain: "# Title\n- one")
        expectEqual(WritePaste.markdown(from: board), "# Title\n- one")
    }

    test("plain text pastes as it is") {
        expectEqual(WritePaste.markdown(from: pasteboard(plain: "# Title\r\n- one")), "# Title\n- one")
    }

    test("a paste of Markdown into an empty document gives its blocks") {
        let view = editor()
        view.paste(from: pasteboard(plain: "# Title\n\n- one"))
        expectEqual(view.markdown, "# Title\n\n- one")
    }

    test("a paste of one line keeps the block of the paragraph at the caret") {
        let view = editor("- Buy ")
        view.setSelectedRange(NSRange(location: view.string.utf16.count, length: 0))
        view.paste(from: pasteboard(html: "<b>milk</b>", plain: "milk"))
        expectEqual(view.markdown, "- Buy **milk**")
    }

    test("one undo removes the whole paste") {
        let view = editor("Hi")
        view.setSelectedRange(NSRange(location: 2, length: 0))
        view.paste(from: pasteboard(plain: " there\n\n- one\n- two"))
        view.undoManager?.undo()
        expectEqual(view.markdown, "Hi")
    }

    test("Paste as Plain Text inserts the text with no conversion") {
        let view = editor()
        view.pasteAsPlainText(from: pasteboard(html: "<b>milk</b>", plain: "# milk"))
        expectEqual(view.string, "# milk")
    }
}
