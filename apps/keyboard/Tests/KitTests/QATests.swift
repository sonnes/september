#if DEBUG
import SeptemberKit

func qaTests() {
    test("the QA hook reads its commands") {
        expectEqual(QACommand(line: "down E"), .down("E"))
        expectEqual(QACommand(line: "tap 1, shift for !"), .tap("1, shift for !"))
        expectEqual(QACommand(line: "hold 1500 Delete"), .hold("Delete", milliseconds: 1500))
        expectEqual(QACommand(line: "up"), .up)
        expectEqual(QACommand(line: "drag keyboard 100 -50"), .drag(window: "keyboard", dx: 100, dy: -50))
        expectEqual(QACommand(line: "wait 300"), .wait(milliseconds: 300))
    }

    test("the QA hook rejects a command that it does not know") {
        expectEqual(QACommand(line: "jump E"), nil)
        expectEqual(QACommand(line: "hold E"), nil)
        expectEqual(QACommand(line: "drag keyboard 1"), nil)
        expectEqual(QACommand(line: "down"), nil)
    }
}
#endif
