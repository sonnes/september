import Foundation

/// An ElevenLabs model. The list is `VOICE_MODELS` in
/// `packages/core/rules/voice.ts`, so a voice sounds the same in the keyboard
/// and in the September app.
public struct VoiceModel: Equatable, Sendable, Identifiable {
    public let id: String
    public let name: String
    /// The text under the name in Settings.
    public let detail: String
    /// The ElevenLabs credits that one character costs.
    public let credits: Double

    /// The models, fastest first.
    public static let all: [VoiceModel] = [
        VoiceModel(
            id: "eleven_flash_v2_5", name: "Eleven Flash v2.5",
            detail: "Fastest. 0.5 credits for each character.", credits: 0.5),
        VoiceModel(
            id: "eleven_multilingual_v2", name: "Eleven Multilingual v2",
            detail: "Best quality. 1 credit for each character.", credits: 1),
        VoiceModel(
            id: "eleven_v3", name: "Eleven v3",
            detail: "Most expressive. Reads audio tags. 1 credit for each character.", credits: 1),
    ]

    /// Flash starts to speak first.
    public static let defaultID = "eleven_flash_v2_5"

    private static let replaced = [
        "eleven_turbo_v2_5": "eleven_flash_v2_5",
        "eleven_turbo_v2": "eleven_flash_v2",
    ]

    /// A saved model ID, with a deprecated Turbo model read as its replacement.
    public static func id(from saved: String) -> String { replaced[saved] ?? saved }

    /// Eleven v3 has no similarity setting, and takes three stability modes.
    static func hasSimilarity(_ id: String) -> Bool { id != "eleven_v3" }
}

/// The stability and the similarity that ElevenLabs reads in `voice_settings`.
public struct VoiceSound: Equatable, Sendable {
    public let stability: Double
    public let similarity: Double

    public init(stability: Double, similarity: Double) {
        self.stability = stability
        self.similarity = similarity
    }
}

/// The Expression presets of `EXPRESSIONS` in `packages/core/rules/voice.ts`.
/// Each one sets the stability and keeps the model.
public enum Expression: String, Codable, CaseIterable, Sendable {
    case steady
    case natural
    case expressive

    public var label: String {
        switch self {
        case .steady: "Steady"
        case .natural: "Natural"
        case .expressive: "Expressive"
        }
    }

    private var stability: Double {
        switch self {
        case .steady: 0.75
        case .natural: 0.5
        case .expressive: 0.35
        }
    }

    /// The stability mode of Eleven v3: Robust, Natural, or Creative.
    private var v3Stability: Double {
        switch self {
        case .steady: 1
        case .natural: 0.5
        case .expressive: 0
        }
    }

    private static let similarity = 0.75

    public func sound(model: String) -> VoiceSound {
        VoiceSound(
            stability: VoiceModel.hasSimilarity(model) ? stability : v3Stability,
            similarity: Self.similarity)
    }
}
