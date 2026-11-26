import Foundation
import SeptemberKit

private func key(_ id: String) -> KeyDefinition {
    KeyboardLayout.rows.lazy.flatMap(\.keys).first { $0.id == id }!
}

private func mirrored(_ text: String) -> FocusedField {
    FocusedField(
        appName: "Messages", role: "AXTextArea", isEditable: true, isSecure: false, text: text,
        selection: NSRange(location: text.utf16.count, length: 0))
}

@MainActor
private func makeAidedController() throws -> (KeyboardController, RecordingSink) {
    let (controller, sink) = try makeController()
    controller.typingAids = TypingAids()
    return (controller, sink)
}

@MainActor
func typingAidsTests() {
    let aids = TypingAids()

    // MARK: The rules

    test("a mark that ends a clause gets a space after it") {
        for mark in [".", ",", ";", ":", "?", "!"] {
            let plan = aids.plan(typing: mark, before: "Hello", autoSpaceBefore: false)
            expectEqual(plan, TypingAids.Plan(deleteBefore: 0, text: mark + " ", addsSpace: true))
        }
    }

    test("a mark in a number, an email address, or a URL gets no space") {
        for before in ["3", "10", "ravi@x", "https://x", "www.x"] {
            let plan = aids.plan(typing: ".", before: before, autoSpaceBefore: false)
            expectEqual(plan.text, ".", before)
            expect(!plan.addsSpace, before)
        }
    }

    test("punctuation after a space that the keyboard added removes that space") {
        let plan = aids.plan(typing: ",", before: "thanks ", autoSpaceBefore: true)
        expectEqual(plan, TypingAids.Plan(deleteBefore: 1, text: ", ", addsSpace: true))
        let quote = aids.plan(typing: ")", before: "thanks ", autoSpaceBefore: true)
        expectEqual(quote.deleteBefore, 1)
    }

    test("a letter after a space that the keyboard added keeps the space") {
        let plan = aids.plan(typing: "w", before: "Hello, ", autoSpaceBefore: true)
        expectEqual(plan, TypingAids.Plan(deleteBefore: 0, text: "w", addsSpace: false))
    }

    test("a space that the user typed stays before punctuation") {
        let plan = aids.plan(typing: ",", before: "thanks ", autoSpaceBefore: false)
        expectEqual(plan.deleteBefore, 0)
    }

    test("straight quotes become smart quotes that open after a space and close after a word") {
        expectEqual(aids.plan(typing: "\"", before: "", autoSpaceBefore: false).text, "\u{201C}")
        expectEqual(aids.plan(typing: "\"", before: "say ", autoSpaceBefore: false).text, "\u{201C}")
        expectEqual(aids.plan(typing: "\"", before: "say \u{201C}hi", autoSpaceBefore: false).text, "\u{201D}")
        expectEqual(aids.plan(typing: "'", before: "it", autoSpaceBefore: false).text, "\u{2019}")
        expectEqual(aids.plan(typing: "'", before: "(", autoSpaceBefore: false).text, "\u{2018}")
    }

    test("each aid turns off on its own") {
        var off = TypingAids()
        off.autoSpace = false
        off.smartQuotes = false
        expectEqual(off.plan(typing: ".", before: "Hello", autoSpaceBefore: false).text, ".")
        expectEqual(off.plan(typing: "\"", before: "", autoSpaceBefore: false).text, "\"")
        expectEqual(off.plan(typing: ",", before: "thanks ", autoSpaceBefore: true).deleteBefore, 0)
    }

    test("a sentence starts in an empty field, after a line break, and after an end mark and a space") {
        for before in ["", "Hi.\n", "See you soon. ", "Really? ", "Wow! "] {
            expect(aids.startsSentence(before: before), before.debugDescription)
        }
        for before in ["Hi", "See you soon.", "e.g, ", "Hello "] {
            expect(!aids.startsSentence(before: before), before.debugDescription)
        }
    }

    // MARK: The keyboard

    test("a period on the keys types the period and a space") {
        let (controller, sink) = try makeAidedController()
        controller.focusChanged(to: mirrored("See you soon"))
        controller.press(key("key-."))
        expectEqual(sink.typed, [".", " "])
    }

    test("a comma right after a picked word replaces the space of the word") {
        let (controller, sink) = try makeAidedController()
        controller.focusChanged(to: mirrored("thanks "))
        controller.wordInserted()
        sink.reset()
        controller.press(key("key-,"))
        let deletes = sink.posted.filter { $0.virtualKey == VirtualKey.delete.rawValue && $0.isDown }
        expectEqual(deletes.count, 1)
        expectEqual(sink.typed, [",", " "])
    }

    test("a letter at the start of a sentence becomes a capital, and other text stays as it is") {
        expectEqual(aids.plan(typing: "h", before: "", autoSpaceBefore: false).text, "H")
        expectEqual(aids.plan(typing: "o", before: "See you soon. ", autoSpaceBefore: false).text, "O")
        expectEqual(aids.plan(typing: "o", before: "See you ", autoSpaceBefore: false).text, "o")
        expectEqual(aids.plan(typing: "1", before: "", autoSpaceBefore: false).text, "1")
        expectEqual(aids.plan(typing: "\u{00E9}", before: "", autoSpaceBefore: false).text, "\u{00C9}")
    }

    test("a capital at the start of a sentence goes out as the letter itself, and Shift stays off") {
        let (controller, sink) = try makeAidedController()
        controller.focusChanged(to: mirrored("See you soon. "))
        expect(!controller.modifiers.active.contains(.shift), "no latch")
        controller.press(key("key-o"))
        expectEqual(sink.typed, ["O"])
        expect(!sink.posted.contains { $0.virtualKey == 56 }, "no Shift key event")
        expect(!controller.modifiers.active.contains(.shift))
    }

    test("a mark at the start of a sentence stays the mark, not its shifted glyph") {
        let (controller, sink) = try makeAidedController()
        controller.focusChanged(to: mirrored(""))
        controller.press(key("key-,"))
        expectEqual(sink.typed.first, ",")
    }

    test("with the capital aid off, a letter at the start of a sentence stays small") {
        let (controller, sink) = try makeAidedController()
        controller.typingAids.autoCapital = false
        controller.focusChanged(to: mirrored(""))
        controller.press(key("key-a"))
        expectEqual(sink.downs.map(\.key), [0], "the key of a")
        expect(sink.typed.isEmpty)
    }

    test("a password field gets no typing aid") {
        let (controller, sink) = try makeAidedController()
        controller.focusChanged(
            to: FocusedField(
                appName: "Safari", role: "AXTextField", subrole: "AXSecureTextField", isEditable: true,
                isSecure: true, text: nil, selection: NSRange(location: 0, length: 0)))
        controller.press(key("key-a"))
        controller.press(key("key-."))
        expect(!sink.typed.contains(" "), "no space")
        expect(!sink.typed.contains("A"), "no capital")
    }
}
