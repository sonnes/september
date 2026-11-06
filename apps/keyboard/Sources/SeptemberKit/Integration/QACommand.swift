#if DEBUG
import Foundation

/// A command of the QA hook. Debug builds only.
///
/// The hook presses the controls of the keyboard with synthetic mouse events,
/// so a test can hold a key or drag a grip without the pointer of the user.
/// A control is found by its accessibility label.
public enum QACommand: Equatable, Sendable {
    /// `down <label>`: the button goes down on the control.
    case down(String)
    /// `up`: the button goes up where it went down.
    case up
    /// `tap <label>`: down and up, with no time between them.
    case tap(String)
    /// `hold <ms> <label>`: down, a wait of `ms` milliseconds, and up.
    case hold(String, milliseconds: Int)
    /// `drag <window> <dx> <dy>`: drags the grip of a window by `dx` and `dy`
    /// points, in the coordinates of AppKit (up is positive).
    case drag(window: String, dx: Double, dy: Double)
    /// `wait <ms>`: waits before the next command.
    case wait(milliseconds: Int)

    public init?(line: String) {
        let words = line.split(separator: " ", omittingEmptySubsequences: true).map(String.init)
        guard let verb = words.first else { return nil }
        let rest = words.dropFirst()
        switch verb {
        case "down" where !rest.isEmpty:
            self = .down(rest.joined(separator: " "))
        case "up" where rest.isEmpty:
            self = .up
        case "tap" where !rest.isEmpty:
            self = .tap(rest.joined(separator: " "))
        case "hold" where rest.count >= 2:
            guard let ms = Int(rest.first!) else { return nil }
            self = .hold(rest.dropFirst().joined(separator: " "), milliseconds: ms)
        case "drag" where rest.count == 3:
            let numbers = rest.dropFirst().compactMap(Double.init)
            guard numbers.count == 2 else { return nil }
            self = .drag(window: rest.first!, dx: numbers[0], dy: numbers[1])
        case "wait" where rest.count == 1:
            guard let ms = Int(rest.first!) else { return nil }
            self = .wait(milliseconds: ms)
        default:
            return nil
        }
    }
}
#endif
