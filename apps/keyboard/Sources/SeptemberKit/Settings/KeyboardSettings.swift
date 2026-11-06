import AppKit
import Combine
import Foundation

/// The light or dark choice of the Look page.
public enum AppearanceSetting: String, Sendable, CaseIterable, Identifiable {
    /// The keyboard follows the system setting.
    case system
    case light
    case dark

    public var id: Self { self }

    public var title: String {
        switch self {
        case .system: "Automatic"
        case .light: "Light"
        case .dark: "Dark"
        }
    }

    /// The appearance to set on the keyboard windows. `nil` follows the
    /// system.
    public var appearanceName: NSAppearance.Name? {
        switch self {
        case .system: nil
        case .light: .aqua
        case .dark: .darkAqua
        }
    }
}

/// The settings of the Look page, and the Return key of Talk mode. They are
/// kept in `UserDefaults`.
@MainActor
public final class KeyboardSettings: ObservableObject {
    private enum Key {
        static let style = "look.style"
        static let appearance = "look.appearance"
        static let returnSpeaksInTalk = "talk.returnSpeaks"
    }

    @Published public var style: KeyboardStyle {
        didSet { defaults.set(style.rawValue, forKey: Key.style) }
    }
    @Published public var appearance: AppearanceSetting {
        didSet { defaults.set(appearance.rawValue, forKey: Key.appearance) }
    }
    /// In Talk mode, the Return key speaks the bar.
    @Published public var returnSpeaksInTalk: Bool {
        didSet { defaults.set(returnSpeaksInTalk, forKey: Key.returnSpeaksInTalk) }
    }

    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        style = defaults.string(forKey: Key.style).flatMap { KeyboardStyle(rawValue: $0) } ?? .rainbow
        appearance =
            defaults.string(forKey: Key.appearance).flatMap { AppearanceSetting(rawValue: $0) } ?? .system
        returnSpeaksInTalk = defaults.object(forKey: Key.returnSpeaksInTalk) as? Bool ?? true
    }
}
