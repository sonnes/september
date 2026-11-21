import AppKit
import SeptemberKit

@MainActor
func writeWebEditorTests() {
    func opened(_ page: FakeEditorPage) -> [EditorOpenRequest] {
        page.calls.compactMap { call in
            if case .open(let request, _) = call { return request }
            return nil
        }
    }

    test("the editor opens a document on the page, and a new document as an empty heading") {
        let page = FakeEditorPage()
        let editor = WriteWebEditor(page: page)

        editor.show("# Old\n\nText")
        expectEqual(opened(page).last?.text, "# Old\n\nText")
        expectEqual(opened(page).last?.mode, "rich")
        expectEqual(editor.text, "# Old\n\nText")

        editor.show("")
        expectEqual(opened(page).last?.text, "# ")
        expectEqual(editor.text, "", "the new document has no text until the user types")
    }

    test("the editor sets the look of the page before the first document") {
        let page = FakeEditorPage()
        _ = WriteWebEditor(page: page)
        expectEqual(page.calls.first, .theme(.write))
    }

    test("a state of the page gives the text, the caret, and the height, and an edit calls back") {
        let page = FakeEditorPage()
        let editor = WriteWebEditor(page: page)
        var edits = 0
        var carets: [EditorCaret] = []
        var layouts = 0
        editor.onTextChange = { edits += 1 }
        editor.onCaretChange = { carets.append($0) }
        editor.onLayoutChange = { layouts += 1 }
        editor.show("# New")

        page.type(" Plans")
        expectEqual(editor.text, "# New Plans")
        expectEqual(edits, 1)
        expectEqual(carets.last, EditorCaret(text: "New Plans", caret: 9, length: 0))
        expectEqual(editor.caret, EditorCaret(text: "New Plans", caret: 9, length: 0))
        expectEqual(editor.contentHeight, page.height)
        expectEqual(layouts, 1)
    }

    test("a caret move with no new text is not an edit") {
        let page = FakeEditorPage()
        let editor = WriteWebEditor(page: page)
        var edits = 0
        var carets: [EditorCaret] = []
        editor.onTextChange = { edits += 1 }
        editor.onCaretChange = { carets.append($0) }
        editor.show("# New")

        page.moveCaret(EditorCaret(text: "New", caret: 1, length: 0))
        expectEqual(edits, 0)
        expectEqual(carets, [EditorCaret(text: "New", caret: 1, length: 0)])
    }

    test("a state of an earlier document does not change the open document") {
        let page = FakeEditorPage()
        let editor = WriteWebEditor(page: page)
        var edits = 0
        editor.onTextChange = { edits += 1 }
        editor.show("# First")
        let first = page.open
        editor.show("# Second")

        page.deliver(state: "# First edited", open: first)
        expectEqual(editor.text, "# Second")
        expectEqual(edits, 0)
    }

    test("a document that the rich editor cannot keep opens again as Markdown source") {
        let page = FakeEditorPage()
        let editor = WriteWebEditor(page: page)
        editor.show("<div>raw</div>")

        page.onMessage?(.lossy(["HTML"]))
        expectEqual(opened(page).map(\.mode), ["rich", "source"])
        expectEqual(opened(page).last?.text, "<div>raw</div>")

        editor.show("# Plain")
        expectEqual(opened(page).last?.mode, "rich", "the next document opens rich again")
    }

    test("links of the page go to the link callback") {
        let page = FakeEditorPage()
        let editor = WriteWebEditor(page: page)
        var links: [WriteLink] = []
        editor.onOpenLink = { links.append($0) }

        page.onMessage?(.link(.wiki(target: "Plans")))
        page.onMessage?(.link(.url("https://example.com")))
        expectEqual(links, [.wiki(target: "Plans"), .url("https://example.com")])
    }

    test("Rename asks the page to select the title") {
        let page = FakeEditorPage()
        let editor = WriteWebEditor(page: page)
        editor.show("# Old")
        editor.selectTitle()
        expectEqual(page.calls.last, .selectTitle)
    }

    test("after the page loads again, it shows the open document with its edits") {
        let page = FakeEditorPage()
        let editor = WriteWebEditor(page: page)
        editor.show("# New")
        page.type(" Plans")

        page.onReload?()
        expectEqual(page.calls.suffix(2).first, .theme(.write))
        expectEqual(opened(page).last?.text, "# New Plans")
    }

    test("Speak reads the selection of the page, or the whole document without marks") {
        let page = FakeEditorPage()
        let editor = WriteWebEditor(page: page)
        editor.show("# Plan\n\nSee **the roses**.")
        expectEqual(editor.speech.text, MarkdownSpeech.plainText("# Plan\n\nSee **the roses**."))

        page.select("the roses")
        expectEqual(editor.speech.text, "the roses")
    }

    test("the page messages decode, and an unknown or broken message is unused") {
        expectEqual(EditorMessage(body: ["action": "ready"]), .ready)
        expectEqual(
            EditorMessage(body: [
                "action": "state", "open": 2, "text": "# Hi", "selection": "",
                "caret": ["text": "Hi", "caret": 2, "length": 0], "empty": false, "height": 180,
            ]),
            .state(EditorPageState(
                open: 2, text: "# Hi", caret: EditorCaret(text: "Hi", caret: 2, length: 0), selection: "",
                height: 180)))
        expectEqual(
            EditorMessage(body: [
                "action": "state", "open": 1, "text": "", "selection": "", "caret": NSNull(), "empty": true,
                "height": 96,
            ]),
            .state(EditorPageState(
                open: 1, text: "", caret: EditorCaret(text: "", caret: 0, length: 0, documentIsEmpty: true),
                selection: "", height: 96)))
        expectEqual(
            EditorMessage(body: ["action": "link", "kind": "wiki", "target": "Plans"]), .link(.wiki(target: "Plans")))
        expectEqual(
            EditorMessage(body: ["action": "link", "kind": "url", "target": "https://a.com"]),
            .link(.url("https://a.com")))
        expectEqual(EditorMessage(body: ["action": "lossy", "path": "write-1", "reasons": ["HTML"]]), .lossy(["HTML"]))
        expectEqual(EditorMessage(body: ["action": "state", "open": 1]), .unused)
        for action in ["change", "image", "copy", "explain", "capture"] {
            expectEqual(EditorMessage(body: ["action": action]), .unused)
        }
        expectEqual(EditorMessage(body: "not a dictionary"), .unused)
    }

    test("an open call names its document and passes the text as JSON") {
        let request = EditorOpenRequest(path: "write-3", text: "# \"Hi\"\n", mode: "rich")
        let script = EditorCall.open(request, number: 3).script
        expect(script.hasPrefix("window.piper.open("), script)
        expect(script.contains(##""text":"# \"Hi\"\n""##), script)
        expect(script.contains("window.septemberWrite.opened(3)"), script)
    }
}
