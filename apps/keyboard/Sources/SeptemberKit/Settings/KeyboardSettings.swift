import Combine
import Foundation

/// The settings of the Look page, the Typing page, and the Return key of
/// Talk mode. They are kept in `UserDefaults`.
@MainActor
public final class KeyboardSettings: ObservableObject {
    private enum Key {
        static let style = "look.style"
        static let returnSpeaksInTalk = "talk.returnSpeaks"
        static let stickyRepeat = "typing.stickyRepeat"
    }

    @Published public var style: KeyboardStyle {
        didSet { defaults.set(style.rawValue, forKey: Key.style) }
    }
    /// In Talk mode, the Return key speaks the bar.
    @Published public var returnSpeaksInTalk: Bool {
        didSet { defaults.set(returnSpeaksInTalk, forKey: Key.returnSpeaksInTalk) }
    }

    /// A tap on a key that repeats starts the repeat, and the next tap stops
    /// it. Off by default.
    @Published public var stickyRepeat: Bool {
        didSet { defaults.set(stickyRepeat, forKey: Key.stickyRepeat) }
    }

    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        style = defaults.string(forKey: Key.style).flatMap { KeyboardStyle(rawValue: $0) } ?? .rainbow
        returnSpeaksInTalk = defaults.object(forKey: Key.returnSpeaksInTalk) as? Bool ?? true
        stickyRepeat = defaults.bool(forKey: Key.stickyRepeat)
    }
}
