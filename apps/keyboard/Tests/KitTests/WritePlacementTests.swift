import CoreGraphics
import SeptemberKit

private func close(_ a: CGFloat, _ b: CGFloat) -> Bool { abs(a - b) < 0.5 }

func writePlacementTests() {
    let screen = CGRect(x: 0, y: 0, width: 1800, height: 1100)
    let bar = CGRect(x: 600, y: 300, width: 600, height: 44)
    let sidebar = Metrics.writeSidebarWidth

    test("the default window holds an A4 page beside the sidebar, as tall as the room above the keyboard") {
        let frame = WritePlacement.frame(size: nil, bar: bar, floor: 400, screen: screen, margin: 24)
        expect(close(frame.minY, 424), "bottom \(frame.minY)")
        expect(close(frame.maxY, 1076), "top \(frame.maxY)")
        expect(close((frame.width - sidebar) * 297 / 210, frame.height), "page \(frame.size)")
    }

    test("the window centres on the input bar") {
        let frame = WritePlacement.frame(size: nil, bar: bar, floor: 400, screen: screen, margin: 24)
        expect(close(frame.midX, bar.midX), "centre \(frame.midX)")
    }

    test("the window stays on the screen when the bar is at the edge") {
        let edge = CGRect(x: 0, y: 300, width: 200, height: 44)
        let frame = WritePlacement.frame(size: nil, bar: edge, floor: 400, screen: screen, margin: 24)
        expect(close(frame.minX, 24), "left \(frame.minX)")
    }

    test("on a narrow screen the page fits the width and keeps the shape of A4") {
        let narrow = CGRect(x: 0, y: 0, width: 800, height: 1100)
        let frame = WritePlacement.frame(size: nil, bar: bar, floor: 100, screen: narrow, margin: 24)
        expect(close(frame.width, 752), "width \(frame.width)")
        expect(close((frame.width - sidebar) * 297 / 210, frame.height), "page \(frame.size)")
    }

    test("a size the user chose is kept") {
        let size = CGSize(width: 900, height: 500)
        let frame = WritePlacement.frame(size: size, bar: bar, floor: 400, screen: screen, margin: 24)
        expectEqual(frame.size, size)
        expect(close(frame.minY, 424), "bottom \(frame.minY)")
    }

    test("a rect in the keyboard window converts to the screen") {
        let window = CGRect(x: 100, y: 50, width: 1000, height: 400)
        let inWindow = CGRect(x: 20, y: 30, width: 600, height: 44)
        expectEqual(
            WritePlacement.screenRect(inWindow, in: window),
            CGRect(x: 120, y: 376, width: 600, height: 44))
    }
}
