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

    /// What a held key does, on the keyboard or on a panel button. A key that
    /// repeats on a hardware keyboard, such as an arrow or Delete, repeats
    /// without Command or Control. Thus a held key moves the caret, extends
    /// the selection, or pages. With Command or Control, the key acts once, so
    /// a long dwell does not do a window or app command again and again.
    public static func forKey(_ key: VirtualKey, modifiers: Modifiers) -> HoldBehavior {
        key.repeatsWhenHeld && modifiers.isDisjoint(with: [.command, .control]) ? .repeats : .once
    }
}

/// Work that a `DelayScheduler` can stop before it runs.
@MainActor
public protocol ScheduledWork: AnyObject {
    func cancel()
}

/// Runs work after a delay, for a held key and for the input bar. The app
/// uses the main queue. The tests use a fake clock.
@MainActor
public protocol DelayScheduler {
    func schedule(after delay: TimeInterval, _ work: @escaping @MainActor () -> Void) -> any ScheduledWork
}

public struct MainQueueScheduler: DelayScheduler {
    public init() {}

    private final class Item: ScheduledWork {
        let item: DispatchWorkItem
        init(_ item: DispatchWorkItem) { self.item = item }
        func cancel() { item.cancel() }
    }

    public func schedule(after delay: TimeInterval, _ work: @escaping @MainActor () -> Void) -> any ScheduledWork {
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
///
/// With sticky repeat on, a tap on a key that repeats starts the repeat, and
/// the repeat goes on after the button goes up. The next tap stops it. A tap
/// on the same key only stops it. A tap on another control stops it and
/// acts. The Apple Accessibility Keyboard calls this sticky key repeat.
@MainActor
public final class KeyPresser {
    private let timing: () -> KeyTiming
    private let scheduler: any DelayScheduler
    private var active: Int?
    private var lastID = 0
    private var pending: (any ScheduledWork)?
    private let stickyRepeat: () -> Bool
    /// The key of the repeat that goes on after its button went up.
    private var stickyKey: String??

    /// - Parameter timing: reads the settings. Each press reads them again,
    ///   so a change in System Settings applies to the next press.
    public init(
        timing: @escaping () -> KeyTiming = { KeyTiming.current() },
        scheduler: any DelayScheduler = MainQueueScheduler(),
        stickyRepeat: @escaping () -> Bool = { false }
    ) {
        self.timing = timing
        self.scheduler = scheduler
        self.stickyRepeat = stickyRepeat
    }

    /// True while a sticky repeat goes on.
    public var isStickyRepeating: Bool { stickyKey != nil }

    /// The button went down on a control.
    ///
    /// - Parameters:
    ///   - key: the control, so that a second tap on it stops its sticky
    ///     repeat. `nil` is a control with no identity.
    ///   - act: the first action of the press.
    ///   - again: each repeat.
    ///   - choices: shows the accents of a held letter.
    /// - Returns: the press, for `up`.
    @discardableResult
    public func down(
        _ hold: HoldBehavior,
        key: String? = nil,
        act: @escaping @MainActor () -> Void,
        again: @escaping @MainActor () -> Void,
        choices: @escaping @MainActor ([String]) -> Void
    ) -> Int {
        let stopped = stickyKey
        end()
        lastID += 1
        let id = lastID
        if let stopped, stopped == key, key != nil { return id }
        active = id
        let timing = timing()
        if case .repeats = hold, stickyRepeat() { stickyKey = .some(key) }
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
        guard press == active, stickyKey == nil else { return }
        end()
    }

    private func end() {
        pending?.cancel()
        pending = nil
        active = nil
        stickyKey = nil
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
