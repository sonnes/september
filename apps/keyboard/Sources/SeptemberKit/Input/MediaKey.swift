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
        /// A key event with this key code.
        case key(UInt16)
    }

    /// The media key on F1 to F12, in the order of an Apple keyboard.
    public static func onFunctionKey(_ number: Int) -> MediaKey? {
        guard (1...allCases.count).contains(number) else { return nil }
        return allCases[number - 1]
    }

    public var event: Event {
        switch self {
        case .brightnessDown: .system(3)
        case .brightnessUp: .system(2)
        case .missionControl: .key(160)
        case .spotlight: .key(177)
        case .dictation: .key(176)
        case .doNotDisturb: .key(178)
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
