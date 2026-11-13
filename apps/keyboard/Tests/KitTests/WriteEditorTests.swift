import AppKit
import SeptemberKit

@MainActor
func writeEditorTests() {
    func editor(_ markdown: String = "") -> WriteTextView {
        let view = WriteTextView(frame: NSRect(x: 0, y: 0, width: 640, height: 800))
        view.load(markdown)
        return view
    }
    func type(_ view: WriteTextView, _ text: String) {
        for char in text {
            if char == "\n" {
                view.insertNewline(nil)
            } else {
                view.insertText(String(char), replacementRange: NSRange(location: NSNotFound, length: 0))
            }
        }
    }
    func end(_ view: WriteTextView) {
        view.setSelectedRange(NSRange(location: view.string.utf16.count, length: 0))
    }

    test("a file that the editor opens and nobody edits saves byte for byte") {
        let text = "# Plans\n\n* one\n* two\n\n1) a\n\n```js\nx\n```\n\n| a |\n|---|\n"
        expectEqual(editor(text).markdown, text)
    }

    test("one typed character reports the caret and the layout once") {
        let view = editor("Hi")
        var carets: [EditorCaret] = []
        var layouts = 0
        view.onCaretChange = { carets.append($0) }
        view.onLayoutChange = { layouts += 1 }

        type(view, "!")
        expectEqual(carets, [EditorCaret(text: "Hi!", caret: 3, length: 0)])
        expectEqual(layouts, 1)
    }

    test("a Markdown mark that makes a block reports the caret once for its key") {
        let view = editor()
        var carets: [EditorCaret] = []
        view.onCaretChange = { carets.append($0) }

        type(view, "#")
        carets = []
        type(view, " ")
        expectEqual(carets, [EditorCaret(text: "", caret: 0, length: 0, documentIsEmpty: true)])
    }

    test("the text of the editor has no Markdown marks") {
        let view = editor("# Title\n\n- **bold** item\n- [ ] task")
        expectEqual(view.string, "Title\nbold item\ntask")
    }

    test("a hash and a space make a heading") {
        let view = editor()
        type(view, "# Title")
        expectEqual(view.markdown, "# Title")
        expectEqual(view.string, "Title")
    }

    test("a dash and a space make a list, and Return continues it") {
        let view = editor()
        type(view, "- a\nb\n\nc")
        expectEqual(view.markdown, "- a\n- b\n\nc")
    }

    test("a box makes a to-do item, with no dash before it") {
        let view = editor()
        type(view, "[ ] milk\neggs")
        expectEqual(view.markdown, "- [ ] milk\n- [ ] eggs")
    }

    test("a list mark typed in a list item sets the kind of the item") {
        let view = editor()
        type(view, "- a\n- b\n[ ] c\n[x] d\n1. e")
        expectEqual(view.markdown, "- a\n- b\n- [ ] c\n- [x] d\n\n1. e")
    }

    test("a number makes a numbered list that counts on") {
        let view = editor()
        type(view, "1. a\nb")
        expectEqual(view.markdown, "1. a\n2. b")
    }

    test("a quote, a code block, and a rule come from their marks") {
        let quote = editor()
        type(quote, "> said")
        expectEqual(quote.markdown, "> said")

        let code = editor()
        type(code, "``` let a\n\n\nnext")
        expectEqual(code.markdown, "```\nlet a\n```\n\nnext")

        let rule = editor()
        type(rule, "---x")
        expectEqual(rule.markdown, "---\n\nx")
    }

    test("closing marks make bold, italic, struck, and code text, and the next text is plain") {
        let view = editor()
        type(view, "**bold** *it* ~~old~~ `code` plain")
        expectEqual(view.markdown, "**bold** *it* ~~old~~ `code` plain")
        expectEqual(view.string, "bold it old code plain")
    }

    test("closing a link makes a link, and closing a wiki link makes a wiki link") {
        let view = editor()
        type(view, "[site](https://a.b) and [[Notes]]")
        expectEqual(view.markdown, "[site](https://a.b) and [[Notes]]")
        expectEqual(view.string, "site and Notes")
    }

    test("Return after a heading starts a plain paragraph") {
        let view = editor()
        type(view, "# T\nx")
        expectEqual(view.markdown, "# T\n\nx")
    }

    test("a line break stays in the paragraph") {
        let view = editor()
        type(view, "a")
        view.insertLineBreak(nil)
        type(view, "b")
        expectEqual(view.markdown, "a  \nb")
    }

    test("Delete at the start of a heading makes it a paragraph") {
        let view = editor("# T")
        view.setSelectedRange(NSRange(location: 0, length: 0))
        view.deleteBackward(nil)
        expectEqual(view.markdown, "T")
    }

    test("Delete at the start of a list item takes it out of the list") {
        let view = editor("- a\n  - b")
        view.setSelectedRange(NSRange(location: 2, length: 0))
        view.deleteBackward(nil)
        expectEqual(view.markdown, "- a\n- b")
        view.deleteBackward(nil)
        expectEqual(view.markdown, "- a\n\nb")
    }

    test("Tab moves a list item one level deeper, and Shift-Tab moves it back") {
        let view = editor("- a\n- b")
        end(view)
        view.insertTab(nil)
        expectEqual(view.markdown, "- a\n  - b")
        view.insertBacktab(nil)
        expectEqual(view.markdown, "- a\n- b")
    }

    test("Bold toggles on the selection") {
        let view = editor("a b c")
        view.setSelectedRange(NSRange(location: 2, length: 1))
        view.toggle(.bold)
        expectEqual(view.markdown, "a **b** c")
        view.toggle(.bold)
        expectEqual(view.markdown, "a b c")
    }

    test("a to-do item checks and unchecks") {
        let view = editor("- [ ] milk")
        view.toggleTask(at: 0)
        expectEqual(view.markdown, "- [x] milk")
        view.toggleTask(at: 0)
        expectEqual(view.markdown, "- [ ] milk")
    }

    test("text typed at the start of a paragraph after a heading stays in the paragraph") {
        let view = editor("# H\n\np")
        view.setSelectedRange(NSRange(location: 2, length: 0))
        type(view, "x")
        expectEqual(view.markdown, "# H\n\nxp")
    }

    test("the caret gives the paragraph, the offset, and the selection in UTF-16 units") {
        let view = editor("# Head\n\nhello 👋 world")
        end(view)
        expectEqual(view.caret, EditorCaret(text: "hello 👋 world", caret: 14, length: 0))
        view.selectAll(nil)
        expectEqual(view.caret.length, view.string.utf16.count)
        expect(editor().caret.documentIsEmpty)
        expect(!view.caret.documentIsEmpty)
    }

    test("each change of the text or the caret calls back with the caret") {
        let view = editor()
        var carets: [EditorCaret] = []
        view.onCaretChange = { carets.append($0) }
        type(view, "hi")
        expectEqual(carets.last, EditorCaret(text: "hi", caret: 2, length: 0))
    }

    test("Speak reads the selection, or the whole document without marks") {
        let view = editor("# Title\n\n- **one**")
        expectEqual(view.speech, EditorSpeech(selection: "", markdown: "# Title\n\n- **one**"))
        view.setSelectedRange(NSRange(location: 0, length: 5))
        expectEqual(view.speech.text, "Title")
    }

    test("a new document opens with an empty heading") {
        let view = editor()
        view.loadNewDocument()
        type(view, "Plans")
        expectEqual(view.markdown, "# Plans")
    }
}

func writePaperTests() {
    let screen = CGRect(x: 0, y: 0, width: 1800, height: 1100)
    let bar = CGRect(x: 600, y: 300, width: 600, height: 44)
    func close(_ a: CGFloat, _ b: CGFloat) -> Bool { abs(a - b) < 0.5 }

    test("the page is the largest A4 sheet above the keyboard, centred on the bar") {
        let page = WritePaper.page(bar: bar, floor: 400, screen: screen, margin: 24)
        expect(close(page.minY, 424), "bottom \(page.minY)")
        expect(close(page.maxY, 1076), "top \(page.maxY)")
        expect(close(page.width * 297 / 210, page.height), "page \(page.size)")
        expect(close(page.midX, bar.midX), "centre \(page.midX)")
    }

    test("the page stays on a narrow screen and keeps the shape of A4") {
        let narrow = CGRect(x: 0, y: 0, width: 400, height: 1100)
        let page = WritePaper.page(bar: bar, floor: 400, screen: narrow, margin: 24)
        expect(close(page.width, 352), "width \(page.width)")
        expect(close(page.width * 297 / 210, page.height), "page \(page.size)")
    }

    test("the paper grows up from the bottom of the page and stops at its top") {
        let page = CGRect(x: 100, y: 424, width: 461, height: 652)
        expectEqual(WritePaper.paper(height: 180, on: page), CGRect(x: 100, y: 424, width: 461, height: 180))
        expectEqual(WritePaper.paper(height: 5000, on: page), page)
    }

    test("on a full page, the text moves up so the typing line stays at the bottom") {
        let origin = WritePaper.scrollOrigin(
            caretMaxY: 1500, current: 0, visibleHeight: 600, contentHeight: 2000, margin: 48)
        expect(close(origin, 948), "origin \(origin)")
        let atEnd = WritePaper.scrollOrigin(
            caretMaxY: 1990, current: 0, visibleHeight: 600, contentHeight: 2000, margin: 48)
        expect(close(atEnd, 1400), "origin \(atEnd)")
    }

    test("a caret that is already in view does not move the text") {
        let origin = WritePaper.scrollOrigin(
            caretMaxY: 700, current: 400, visibleHeight: 600, contentHeight: 2000, margin: 48)
        expect(close(origin, 400), "origin \(origin)")
    }

    test("a caret above the view brings its line to the top") {
        let origin = WritePaper.scrollOrigin(
            caretMaxY: 300, current: 900, visibleHeight: 600, contentHeight: 2000, margin: 48, caretHeight: 30)
        expect(close(origin, 222), "origin \(origin)")
    }
}

func writeCurveTests() {
    test("a timing curve starts at 0, ends at 1, and never goes back") {
        let curve = CubicCurve.easeOut
        expectEqual(curve.value(at: 0), 0)
        expectEqual(curve.value(at: 1), 1)
        var last = 0.0
        for step in 1...20 {
            let value = curve.value(at: Double(step) / 20)
            expect(value >= last, "step \(step): \(value) < \(last)")
            last = value
        }
    }

    test("an ease-out curve is past the middle at half the time") {
        expect(CubicCurve.easeOut.value(at: 0.5) > 0.6)
        expect(abs(CubicCurve(0, 0, 1, 1).value(at: 0.3) - 0.3) < 0.001)
    }
}
