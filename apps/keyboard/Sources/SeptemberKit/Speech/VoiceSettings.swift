import Combine
import Foundation

/// The service that speaks.
public enum SpeechProvider: String, Codable, CaseIterable, Sendable {
    /// The macOS voices, which include Personal Voice. Nothing leaves the Mac.
    case system
    case elevenLabs
}

/// How the keyboard speaks. The keyboard keeps a macOS voice even when
/// ElevenLabs speaks, because the macOS voice speaks when ElevenLabs fails.
public struct VoiceSettings: Codable, Equatable, Sendable {
    /// The speeds that an ElevenLabs voice takes, `SPEED_RANGE` in
    /// `packages/core/rules/voice.ts`. The macOS voice uses the same range.
    public static let speedRange: ClosedRange<Double> = 0.7...1.2
    public static let volumeRange: ClosedRange<Double> = 0...1

    public var provider: SpeechProvider = .system
    /// An `AVSpeechSynthesisVoice` identifier. `nil` is the default voice of the Mac.
    public var systemVoiceID: String?
    public var elevenLabsVoiceID: String?
    public var modelID: String = VoiceModel.defaultID
    public var expression: Expression = .natural

    public var speed: Double {
        get { storedSpeed }
        set { storedSpeed = newValue.clamped(to: Self.speedRange) }
    }

    public var volume: Double {
        get { storedVolume }
        set { storedVolume = newValue.clamped(to: Self.volumeRange) }
    }

    private var storedSpeed: Double = 1
    private var storedVolume: Double = 1

    public init() {}

    private enum CodingKeys: String, CodingKey {
        case provider, systemVoiceID, elevenLabsVoiceID, modelID, expression
        case storedSpeed = "speed"
        case storedVolume = "volume"
    }

    /// The sound of the chosen Expression on the chosen model.
    public var sound: VoiceSound { expression.sound(model: modelID) }
}

extension Comparable {
    fileprivate func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}

/// The voice settings in `UserDefaults`. A change saves at once.
@MainActor
public final class VoiceSettingsStore: ObservableObject {
    static let key = "speech.voice"

    @Published public var value: VoiceSettings {
        didSet { save() }
    }

    private let defaults: UserDefaults

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        var loaded =
            defaults.data(forKey: Self.key)
            .flatMap { try? JSONDecoder().decode(VoiceSettings.self, from: $0) } ?? VoiceSettings()
        let model = VoiceModel.id(from: loaded.modelID)
        loaded.modelID = VoiceModel.all.contains { $0.id == model } ? model : VoiceModel.defaultID
        value = loaded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(value) else { return }
        defaults.set(data, forKey: Self.key)
    }
}
