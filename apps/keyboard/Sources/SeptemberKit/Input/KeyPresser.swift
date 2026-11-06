import Foundation

/// What a control does while the user holds it.
public enum HoldBehavior: Equatable, Sendable {
    /// Acts one time: a modifier, Return, Escape, Tab, or a shortcut button.
    case once
    /// Repeats while it is held, if key repeat is on: Delete, an arrow,
    /// Space, or a character that is not a letter.
    case repeats
    /// A letter. If press and hold is on, a held letter shows `choices` and
    /// does not repeat. If press and hold is off, the letter repeats.
    case letter(choices: [String])
}

/// Work that a `PressScheduler` can stop before it runs.
@MainActor
public protocol PressCancellable: AnyObject {
    func cancel()
}

/// Runs work after a delay. The app uses the main queue. The tests use a fake
/// clock.
@MainActor
public protocol PressScheduler {
    func schedule(after delay: TimeInterval, _ work: @escaping @MainActor () -> Void) -> any PressCancellable
}

/// Schedules work on the main queue.
public struct MainQueueScheduler: PressScheduler {
    public init() {}

    private final class Item: PressCancellable {
        let item: DispatchWorkItem
        init(_ item: DispatchWorkItem) { self.item = item }
        func cancel() { item.cancel() }
    }

    public func schedule(after delay: TimeInterval, _ work: @escaping @MainActor () -> Void) -> any PressCancellable {
        let item = DispatchWorkItem { MainActor.assumeIsolated { work() } }
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: item)
        return Item(item)
    }
}

/// The timing of a key that acts when the button goes down. The views send
/// only the down and the up of the button. This type applies the macOS
/// settings: Slow Keys, key repeat, and press and hold.
///
/// One press is active at a time. A new press ends the press before it.
/// `AXPress` does not come here: an assistive press acts at once.
@MainActor
public final class KeyPresser {
    private let timing: () -> KeyTiming
    private let scheduler: any PressScheduler
    private var active: Int?
    private var lastID = 0
    private var pending: (any PressCancellable)?

    /// - Parameter timing: reads the settings. Each press reads them again,
    ///   so a change in System Settings applies to the next press.
    public init(
        timing: @escaping () -> KeyTiming = { KeyTiming.current() },
        scheduler: any PressScheduler = MainQueueScheduler()
    ) {
        self.timing = timing
        self.scheduler = scheduler
    }

    /// The button went down on a control.
    ///
    /// - Parameters:
    ///   - act: the first action of the press.
    ///   - again: each repeat.
    ///   - choices: shows the accents of a held letter.
    /// - Returns: the press, for `up`.
    @discardableResult
    public func down(
        _ hold: HoldBehavior,
        act: @escaping @MainActor () -> Void,
        again: @escaping @MainActor () -> Void,
        choices: @escaping @MainActor ([String]) -> Void
    ) -> Int {
        end()
        lastID += 1
        let id = lastID
        active = id
        let timing = timing()
        let accept: @MainActor () -> Void = { [weak self] in
            act()
            self?.hold(hold, timing: timing, again: again, choices: choices)
        }
        if let delay = timing.slowKeysDelay {
            pending = scheduler.schedule(after: delay, accept)
        } else {
            accept()
        }
        return id
    }

    /// The button of `press` went up. An old press does not end a newer one.
    public func up(_ press: Int) {
        guard press == active else { return }
        end()
    }

    private func end() {
        pending?.cancel()
        pending = nil
        active = nil
    }

    private func hold(
        _ hold: HoldBehavior, timing: KeyTiming, again: @escaping @MainActor () -> Void,
        choices: @escaping @MainActor ([String]) -> Void
    ) {
        switch hold {
        case .once:
            pending = nil
        case .repeats:
            repeating(timing, again: again)
        case .letter(let accents) where timing.pressAndHold:
            guard !accents.isEmpty else {
                pending = nil
                return
            }
            pending = scheduler.schedule(after: timing.holdDelay) { choices(accents) }
        case .letter:
            repeating(timing, again: again)
        }
    }

    private func repeating(_ timing: KeyTiming, again: @escaping @MainActor () -> Void) {
        guard let interval = timing.repeatInterval else {
            pending = nil
            return
        }
        func next(after delay: TimeInterval) {
            pending = scheduler.schedule(after: delay) {
                again()
                next(after: interval)
            }
        }
        next(after: timing.holdDelay)
    }
}
