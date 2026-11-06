import Combine
import Foundation

/// The settings of the Look page, and the Return key of Talk mode. They are
/// kept in `UserDefaults`.
@MainActor
public final class KeyboardSettings: ObservableObject {
    private enum Key {
        static let style = "look.style"
        static let returnSpeaksInTalk = "talk.returnSpeaks"
    }

    @Published public var style: KeyboardStyle {
        didSet { defaults.set(style.rawValue, forKey: Key.style) }
    }
    /// In Talk mode, the Return key speaks the bar.
    @Published public var returnSpeaksInTalk: Bool {
        didSet { defaults.set(returnSpeaksInTalk, forKey: Key.returnSpeaksInTalk) }
    }

    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        style = defaults.string(forKey: Key.style).flatMap { KeyboardStyle(rawValue: $0) } ?? .rainbow
        returnSpeaksInTalk = defaults.object(forKey: Key.returnSpeaksInTalk) as? Bool ?? true
    }
}
