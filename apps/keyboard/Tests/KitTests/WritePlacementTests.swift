import CoreGraphics
import SeptemberKit

func writePlacementTests() {
    test("a rect in the keyboard window converts to the screen") {
        let window = CGRect(x: 100, y: 50, width: 1000, height: 400)
        let inWindow = CGRect(x: 20, y: 30, width: 600, height: 44)
        expectEqual(
            WritePlacement.screenRect(inWindow, in: window),
            CGRect(x: 120, y: 376, width: 600, height: 44))
    }
}
