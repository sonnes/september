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

    test("Shift latches in an empty field and after the end of a sentence, and goes when the text moves on") {
        let (controller, _) = try makeAidedController()
        controller.focusChanged(to: mirrored(""))
        expect(controller.modifiers.active.contains(.shift), "empty field")
        controller.focusChanged(to: mirrored("H"))
        expect(!controller.modifiers.active.contains(.shift), "after a letter")
        controller.focusChanged(to: mirrored("Hi. "))
        expect(controller.modifiers.active.contains(.shift), "after the end of a sentence")
    }

    test("a Shift that the user latched stays when the text moves on") {
        let (controller, _) = try makeAidedController()
        controller.focusChanged(to: mirrored("Hi"))
        controller.press(key("shift-left"))
        controller.focusChanged(to: mirrored("Hi "))
        expect(controller.modifiers.active.contains(.shift))
    }

    test("with auto Shift off, Shift does not latch") {
        let (controller, _) = try makeAidedController()
        controller.typingAids.autoShift = false
        controller.focusChanged(to: mirrored(""))
        expect(!controller.modifiers.active.contains(.shift))
    }

    test("a password field gets no typing aid") {
        let (controller, sink) = try makeAidedController()
        controller.focusChanged(
            to: FocusedField(
                appName: "Safari", role: "AXTextField", subrole: "AXSecureTextField", isEditable: true,
                isSecure: true, text: nil, selection: NSRange(location: 0, length: 0)))
        expect(!controller.modifiers.active.contains(.shift))
        controller.press(key("key-."))
        expect(!sink.typed.contains(" "), "no space")
    }
}
