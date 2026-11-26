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
        static let autoCapital = "typing.autoCapital"
        static let autoSpace = "typing.autoSpace"
        static let smartQuotes = "typing.smartQuotes"
        static let keySize = "look.keySize"
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

    /// A letter at the start of a sentence becomes a capital. On by default.
    @Published public var autoCapital: Bool {
        didSet { defaults.set(autoCapital, forKey: Key.autoCapital) }
    }
    /// A space follows a mark, and goes away before the next mark. On by
    /// default.
    @Published public var autoSpace: Bool {
        didSet { defaults.set(autoSpace, forKey: Key.autoSpace) }
    }
    /// Straight quotes become smart quotes. On by default.
    @Published public var smartQuotes: Bool {
        didSet { defaults.set(smartQuotes, forKey: Key.smartQuotes) }
    }

    /// The size of a key. 48 points by default.
    @Published public var keySize: KeySize {
        didSet { defaults.set(keySize.rawValue, forKey: Key.keySize) }
    }

    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        style = defaults.string(forKey: Key.style).flatMap { KeyboardStyle(rawValue: $0) } ?? .rainbow
        returnSpeaksInTalk = defaults.object(forKey: Key.returnSpeaksInTalk) as? Bool ?? true
        stickyRepeat = defaults.bool(forKey: Key.stickyRepeat)
        autoCapital = defaults.object(forKey: Key.autoCapital) as? Bool ?? true
        autoSpace = defaults.object(forKey: Key.autoSpace) as? Bool ?? true
        smartQuotes = defaults.object(forKey: Key.smartQuotes) as? Bool ?? true
        keySize = KeySize(rawValue: defaults.integer(forKey: Key.keySize)) ?? .regular
    }
}
