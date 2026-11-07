import CoreGraphics
import Foundation
import SeptemberKit

@MainActor
func contextProbeTests() {
    test("a shape keeps the form of the text and none of its words") {
        expectEqual(ContextShape.shape(of: "Your iMessage, Hello there, 10:42"), "W w, W w, 9:9")
        expectEqual(ContextShape.shape(of: "  don't\n\nstop  "), "w'w ⏎ w")
        expectEqual(ContextShape.shape(of: ""), "")
    }

    test("a long shape is cut, with the count of words") {
        let shape = ContextShape.shape(of: String(repeating: "word ", count: 100))
        expect(shape.count < 100)
        expect(shape.hasSuffix("… (100 words)"))
    }

    let field = CGRect(x: 100, y: 800, width: 400, height: 30)
    let tree = ProbeElement(
        role: "AXWindow", texts: [ProbeText(attribute: "title", text: "Ann Lee")],
        onFocusPath: true,
        children: [
            ProbeElement(role: "AXGroup", children: [ProbeElement(role: "AXButton")]),
            ProbeElement(
                role: "AXScrollArea",
                children: [
                    ProbeElement(
                        role: "AXStaticText", identifier: "bubble",
                        frame: CGRect(x: 100, y: 700, width: 300, height: 40),
                        texts: [
                            ProbeText(attribute: "value", text: "See you at noon?"),
                            ProbeText(attribute: "description", text: "Ann Lee, See you at noon?"),
                        ])
                ]),
            ProbeElement(
                role: "AXTextArea", frame: field,
                texts: [ProbeText(attribute: "placeholder", text: "iMessage")],
                isFocused: true, onFocusPath: true),
        ])
    let lines = ContextShape.lines(for: tree, field: field)

    test("the probe shows the elements with text and the path to the field") {
        expectEqual(
            lines,
            [
                "AXWindow  title \"W W\" (7 ch)",
                "  AXScrollArea",
                "    AXStaticText #bubble  dy -100  value \"W w w w?\" (16 ch)  description \"W W, W w w w?\" (25 ch)",
                "  AXTextArea  dy 0  placeholder \"w\" (8 ch)  <- focused",
            ])
    }

    test("the probe prints no word of the text") {
        let all = lines.joined(separator: "\n")
        for word in ["Ann", "Lee", "See", "noon", "iMessage"] {
            expect(!all.contains(word), "the probe printed a word of the text")
        }
    }
}
