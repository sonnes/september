import Foundation
import SeptemberKit

func writeMarkdownTests() {
    let sample = """
        ---
        tags: [a, b]
        ---

        # Plans

        Some *soft* text with **bold**, ~~gone~~, `code`, a [link](https://example.com) and [[Notes|my notes]].
        A second line.

        * star bullet
        * second
          + nested plus

        1) first
        7) second

        - [ ] open task
        - [X] done task

        > quoted
        > more

        ```swift
        let a = 1

        let b = 2
        ```

        ***

        | a | b |
        |---|---|
        | 1 | 2 |

        Setext
        ======

        Trailing paragraph\\
        with a break.

        """

    test("a file that nobody edits saves byte for byte") {
        let document = WriteMarkdown.parse(sample)
        expectEqual(WriteMarkdown.serialize(document.blocks), sample)
    }

    test("a file with no final newline keeps that") {
        let text = "# A\n\nb"
        expectEqual(WriteMarkdown.serialize(WriteMarkdown.parse(text).blocks), text)
    }

    test("the parser finds each kind of block") {
        let kinds = WriteMarkdown.parse(sample).blocks.map(\.kind)
        expectEqual(
            kinds,
            [
                .raw, .heading(1), .paragraph,
                .bullet(depth: 0), .bullet(depth: 0), .bullet(depth: 1),
                .ordered(number: 1, depth: 0), .ordered(number: 7, depth: 0),
                .task(checked: false, depth: 0), .task(checked: true, depth: 0),
                .quote, .code(language: "swift"), .rule, .raw, .heading(1), .paragraph,
            ])
    }

    test("inline marks become runs with no Markdown marks in the text") {
        let block = WriteMarkdown.parse(
            "Some *soft* text with **bold**, ~~gone~~, `code`, a [link](https://example.com) and [[Notes|my notes]]."
        ).blocks[0]
        expectEqual(block.text, "Some soft text with bold, gone, code, a link and my notes.")
        expectEqual(block.runs.first { $0.text == "soft" }?.marks, [.italic])
        expectEqual(block.runs.first { $0.text == "bold" }?.marks, [.bold])
        expectEqual(block.runs.first { $0.text == "gone" }?.marks, [.strike])
        expectEqual(block.runs.first { $0.text == "code" }?.marks, [.code])
        expectEqual(block.runs.first { $0.text == "link" }?.link, .url("https://example.com"))
        expectEqual(block.runs.first { $0.text == "my notes" }?.link, .wiki(target: "Notes"))
    }

    test("snake_case and a lone star stay text") {
        let block = WriteMarkdown.parse("snake_case_name and 2 * 3 * 4").blocks[0]
        expectEqual(block.text, "snake_case_name and 2 * 3 * 4")
        expect(block.runs.allSatisfy { $0.marks.isEmpty }, "\(block.runs)")
    }

    test("a soft break and a hard break become a line break in the text") {
        let block = WriteMarkdown.parse("one\ntwo  \nthree\\\nfour").blocks[0]
        expectEqual(block.text, "one\u{2028}two\u{2028}three\u{2028}four")
    }

    test("a code block keeps its lines and blank lines") {
        let block = WriteMarkdown.parse("```\na\n\nb\n```").blocks[0]
        expectEqual(block.kind, .code(language: ""))
        expectEqual(block.text, "a\u{2028}\u{2028}b")
    }

    test("an edited block saves with the rules of the Piper editor") {
        func save(_ blocks: [WriteBlock]) -> String { WriteMarkdown.serialize(blocks) }
        let plain = { (kind: WriteBlockKind, text: String) in WriteBlock(kind: kind, text: text) }
        expectEqual(save([plain(.heading(2), "Title"), plain(.paragraph, "Body")]), "## Title\n\nBody")
        expectEqual(
            save([plain(.bullet(depth: 0), "a"), plain(.bullet(depth: 1), "b"), plain(.bullet(depth: 0), "c")]),
            "- a\n  - b\n- c")
        expectEqual(
            save([plain(.ordered(number: 3, depth: 0), "a"), plain(.ordered(number: 9, depth: 0), "b")]),
            "3. a\n4. b")
        expectEqual(
            save([plain(.task(checked: false, depth: 0), "open"), plain(.task(checked: true, depth: 0), "done")]),
            "- [ ] open\n- [x] done")
        expectEqual(save([plain(.quote, "a\u{2028}b")]), "> a\n> b")
        expectEqual(save([plain(.code(language: "js"), "a\u{2028}\u{2028}b")]), "```js\na\n\nb\n```")
        expectEqual(save([plain(.rule, "")]), "---")
        expectEqual(save([plain(.paragraph, "one\u{2028}two")]), "one  \ntwo")
    }

    test("a list after a paragraph has a blank line, and items of one list have none") {
        let blocks = [
            WriteBlock(kind: .paragraph, text: "Intro"),
            WriteBlock(kind: .bullet(depth: 0), text: "a"),
            WriteBlock(kind: .task(checked: false, depth: 0), text: "b"),
            WriteBlock(kind: .ordered(number: 1, depth: 0), text: "c"),
        ]
        expectEqual(WriteMarkdown.serialize(blocks), "Intro\n\n- a\n- [ ] b\n\n1. c")
    }

    test("an edited run saves its marks, with spaces outside the marks") {
        let block = WriteBlock(
            kind: .paragraph,
            runs: [
                WriteRun("a "), WriteRun("bold ", marks: [.bold]), WriteRun("both", marks: [.bold, .italic]),
                WriteRun(" x "), WriteRun("tick`s", marks: [.code]), WriteRun(" "),
                WriteRun("site", link: .url("https://a.b")), WriteRun(" "),
                WriteRun("Notes", link: .wiki(target: "Notes")), WriteRun(" "),
                WriteRun("mine", link: .wiki(target: "Notes")),
            ])
        expectEqual(
            WriteMarkdown.serialize([block]),
            "a **bold *both*** x ``tick`s`` [site](https://a.b) [[Notes]] [[Notes|mine]]")
    }

    test("an edit keeps every other block byte for byte") {
        var blocks = WriteMarkdown.parse(sample).blocks
        let index = blocks.firstIndex { $0.kind == .heading(1) }!
        blocks[index] = WriteBlock(kind: .heading(1), text: "Plans for May", source: blocks[index].source)
        let saved = WriteMarkdown.serialize(blocks)
        expectEqual(saved, sample.replacingOccurrences(of: "# Plans\n", with: "# Plans for May\n"))
    }

    test("blank lines past the first become empty paragraphs, and they save the same way") {
        let blocks = WriteMarkdown.parse("a\n\n\n\nb").blocks
        expectEqual(blocks.map(\.kind), [.paragraph, .paragraph, .paragraph])
        expectEqual(blocks[1].text, "")
        let edited = blocks.map { WriteBlock(kind: $0.kind, runs: $0.runs) }
        expectEqual(WriteMarkdown.serialize(edited), "a\n\n\n\nb")
    }

    test("the plain text of a document has no Markdown marks") {
        let blocks = WriteMarkdown.parse("# Title\n\n- **one**\n- [x] two").blocks
        expectEqual(blocks.map(\.text), ["Title", "one", "two"])
    }
}
