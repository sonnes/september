import AVFoundation
import Combine
import Foundation

/// A macOS voice, as the Voice page lists it.
public struct SystemVoice: Equatable, Sendable, Identifiable {
    public enum Quality: Int, Comparable, Sendable {
        case standard
        case enhanced
        case premium

        public var label: String {
            switch self {
            case .standard: "Default"
            case .enhanced: "Enhanced"
            case .premium: "Premium"
            }
        }

        public static func < (lhs: Quality, rhs: Quality) -> Bool { lhs.rawValue < rhs.rawValue }
    }

    public let id: String
    public let name: String
    public let language: String
    public let quality: Quality
    public let isPersonal: Bool
    public let isNovelty: Bool

    public init(
        id: String, name: String, language: String, quality: Quality,
        isPersonal: Bool = false, isNovelty: Bool = false
    ) {
        self.id = id
        self.name = name
        self.language = language
        self.quality = quality
        self.isPersonal = isPersonal
        self.isNovelty = isNovelty
    }

    /// The Personal Voices, and the English voices that are not novelty
    /// voices, best quality first.
    public static func listed(_ voices: [SystemVoice]) -> (personal: [SystemVoice], system: [SystemVoice]) {
        let personal = voices.filter(\.isPersonal)
        let system = voices
            .filter { !$0.isPersonal && !$0.isNovelty && $0.language.hasPrefix("en") }
            .sorted { ($0.quality, $1.name) > ($1.quality, $0.name) }
        return (personal, system)
    }
}

/// The macOS voices on this Mac, and the access to Personal Voice.
@MainActor
public final class SystemVoiceCatalog: ObservableObject {
    public enum PersonalVoiceAccess: Sendable {
        case notAsked, allowed, denied, unsupported
    }

    @Published public private(set) var personal: [SystemVoice] = []
    @Published public private(set) var system: [SystemVoice] = []
    @Published public private(set) var personalVoiceAccess: PersonalVoiceAccess = .notAsked

    public init() {}

    /// The voice that speaks when the settings name no voice.
    public var defaultVoiceID: String? {
        AVSpeechSynthesisVoice(language: AVSpeechSynthesisVoice.currentLanguageCode())?.identifier
    }

    public func refresh() {
        personalVoiceAccess = Self.access(AVSpeechSynthesizer.personalVoiceAuthorizationStatus)
        let listed = SystemVoice.listed(AVSpeechSynthesisVoice.speechVoices().map(Self.voice))
        personal = listed.personal
        system = listed.system
    }

    /// Asks the user to let the keyboard use their Personal Voice.
    public func requestPersonalVoice() async {
        let status = await AVSpeechSynthesizer.requestPersonalVoiceAuthorization()
        personalVoiceAccess = Self.access(status)
        refresh()
    }

    private static func access(_ status: AVSpeechSynthesizer.PersonalVoiceAuthorizationStatus) -> PersonalVoiceAccess {
        switch status {
        case .authorized: .allowed
        case .denied: .denied
        case .unsupported: .unsupported
        default: .notAsked
        }
    }

    private static func voice(_ voice: AVSpeechSynthesisVoice) -> SystemVoice {
        let quality: SystemVoice.Quality =
            switch voice.quality {
            case .premium: .premium
            case .enhanced: .enhanced
            default: .standard
            }
        return SystemVoice(
            id: voice.identifier, name: voice.name, language: voice.language, quality: quality,
            isPersonal: voice.voiceTraits.contains(.isPersonalVoice),
            isNovelty: voice.voiceTraits.contains(.isNoveltyVoice))
    }
}
