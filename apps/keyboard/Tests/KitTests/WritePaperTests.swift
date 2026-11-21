import CoreGraphics
import SeptemberKit

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

    test("the page keeps the leading width free on its left for the tools rail") {
        let narrow = CGRect(x: 0, y: 0, width: 400, height: 1100)
        let page = WritePaper.page(bar: bar, floor: 400, screen: narrow, margin: 24, leading: 70)
        expect(close(page.minX, 94), "left \(page.minX)")
        expect(close(page.maxX, 376), "right \(page.maxX)")
        expect(close(page.width * 297 / 210, page.height), "page \(page.size)")
        let left = WritePaper.page(
            bar: CGRect(x: 0, y: 300, width: 100, height: 44), floor: 400, screen: screen, margin: 24, leading: 70)
        expect(close(left.minX, 94), "left \(left.minX)")
    }

    test("the tools rail stands left of the paper, with the bottom of the paper") {
        let paper = CGRect(x: 300, y: 424, width: 461, height: 180)
        expectEqual(
            WritePaper.rail(paper: paper, size: CGSize(width: 56, height: 300), gap: 14),
            CGRect(x: 230, y: 424, width: 56, height: 300))
    }

    test("the paper grows up from the bottom of the page and stops at its top") {
        let page = CGRect(x: 100, y: 424, width: 461, height: 652)
        expectEqual(WritePaper.paper(height: 180, on: page), CGRect(x: 100, y: 424, width: 461, height: 180))
        expectEqual(WritePaper.paper(height: 5000, on: page), page)
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
