import CoreGraphics
import Foundation

/// The media and system control on an F-key, as printed on an Apple keyboard.
public enum MediaKey: Sendable, Hashable, CaseIterable {
    case brightnessDown
    case brightnessUp
    case missionControl
    case spotlight
    case dictation
    case doNotDisturb
    case previous
    case playPause
    case next
    case mute
    case volumeDown
    case volumeUp

    /// How macOS receives the key.
    public enum Event: Sendable, Hashable {
        /// A system-defined event with this `NX_KEYTYPE_*` value.
        case system(Int32)
        /// Opens the app at this path.
        case app(String)
        /// Presses the Spotlight shortcut of the macOS settings.
        case spotlight
        /// Presses the Start Dictation item of the menu of the app in front.
        case dictation
        /// Runs the Shortcut with this name.
        case shortcut(String)
    }

    /// The media key on F1 to F12, in the order of an Apple keyboard.
    public static func onFunctionKey(_ number: Int) -> MediaKey? {
        guard (1...allCases.count).contains(number) else { return nil }
        return allCases[number - 1]
    }

    /// The Shortcut that F6 runs. macOS has no other way for an app to turn
    /// Do Not Disturb on or off. The user makes it in the Shortcuts app.
    public static let doNotDisturbShortcut = "Toggle Do Not Disturb"

    /// macOS ignores a posted Mission Control, Spotlight, Dictation, or Do
    /// Not Disturb key, so these keys take another route.
    public var event: Event {
        switch self {
        case .brightnessDown: .system(3)
        case .brightnessUp: .system(2)
        case .missionControl: .app("/System/Applications/Mission Control.app")
        case .spotlight: .spotlight
        case .dictation: .dictation
        case .doNotDisturb: .shortcut(Self.doNotDisturbShortcut)
        case .previous: .system(18)
        case .playPause: .system(16)
        case .next: .system(17)
        case .mute: .system(7)
        case .volumeDown: .system(1)
        case .volumeUp: .system(0)
        }
    }

    /// The SF Symbol drawn on the key.
    public var symbolName: String {
        switch self {
        case .brightnessDown: "sun.min"
        case .brightnessUp: "sun.max"
        case .missionControl: "rectangle.3.group"
        case .spotlight: "magnifyingglass"
        case .dictation: "mic"
        case .doNotDisturb: "moon"
        case .previous: "backward.fill"
        case .playPause: "playpause.fill"
        case .next: "forward.fill"
        case .mute: "speaker.slash"
        case .volumeDown: "speaker.wave.1"
        case .volumeUp: "speaker.wave.3"
        }
    }

    /// How VoiceOver says the key.
    public var spokenName: String {
        switch self {
        case .brightnessDown: "Brightness Down"
        case .brightnessUp: "Brightness Up"
        case .missionControl: "Mission Control"
        case .spotlight: "Spotlight"
        case .dictation: "Dictation"
        case .doNotDisturb: "Do Not Disturb"
        case .previous: "Previous Track"
        case .playPause: "Play or Pause"
        case .next: "Next Track"
        case .mute: "Mute"
        case .volumeDown: "Volume Down"
        case .volumeUp: "Volume Up"
        }
    }

    /// The volume and brightness keys repeat while held, as on a hardware
    /// keyboard.
    public var repeatsWhenHeld: Bool {
        switch self {
        case .brightnessDown, .brightnessUp, .volumeDown, .volumeUp: true
        default: false
        }
    }
}

/// The keys of the Spotlight shortcut in the settings of macOS: symbolic
/// hot key 64 of `com.apple.symbolichotkeys`.
public struct SpotlightHotKey: Equatable, Sendable {
    public let virtualKey: UInt16
    public let modifiers: Modifiers

    /// The default of macOS: Command-Space.
    public static let standard = SpotlightHotKey(virtualKey: 49, modifiers: .command)

    init(virtualKey: UInt16, modifiers: Modifiers) {
        self.virtualKey = virtualKey
        self.modifiers = modifiers
    }

    /// The shortcut from `AppleSymbolicHotKeys`. It is nil when the user
    /// turned the shortcut off, and the default when the user never changed
    /// it.
    public init?(symbolicHotKeys: [String: Any]) {
        guard let entry = symbolicHotKeys["64"] as? [String: Any] else {
            self = .standard
            return
        }
        guard (entry["enabled"] as? Int ?? 0) != 0 else { return nil }
        guard
            let value = entry["value"] as? [String: Any],
            let parameters = value["parameters"] as? [Int], parameters.count == 3,
            let virtualKey = UInt16(exactly: parameters[1])
        else {
            self = .standard
            return
        }
        let flags = CGEventFlags(rawValue: UInt64(parameters[2]))
        self.init(
            virtualKey: virtualKey,
            modifiers: Modifiers.held.reduce(into: []) { result, held in
                if flags.contains(held.eventFlag) { result.insert(held.modifier) }
            })
    }

    /// The shortcut in the settings of this Mac.
    public static func current() -> SpotlightHotKey? {
        let defaults = UserDefaults(suiteName: "com.apple.symbolichotkeys")
        let keys = defaults?.dictionary(forKey: "AppleSymbolicHotKeys") ?? [:]
        return SpotlightHotKey(symbolicHotKeys: keys)
    }
}

/// The Start Dictation item of the Edit menu. macOS adds it to the menu of
/// most apps.
public enum DictationMenu {
    /// True for the title of the item that starts dictation, in English.
    public static func isStartItem(_ title: String) -> Bool {
        title.hasPrefix("Start Dictation")
    }
}
