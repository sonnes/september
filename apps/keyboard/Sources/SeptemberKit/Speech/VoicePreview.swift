import AVFoundation
import Foundation

/// Plays a voice from the Voice page: a sample sentence in a macOS voice, or
/// the sample file of an ElevenLabs voice, which costs no credits.
@MainActor
public final class VoicePreview {
    /// `VOICE_SAMPLE_TEXT` in `packages/core/rules/voice.ts`.
    public static let sampleText = "This is how I sound today."

    private let synthesizer = AVSpeechSynthesizer()
    private var player: AVPlayer?

    public init() {}

    public func play(systemVoice id: String?, settings: VoiceSettings) {
        stop()
        var voice = settings
        voice.systemVoiceID = id
        synthesizer.speak(SystemSpeech.utterance(Self.sampleText, voice: voice))
    }

    public func play(sample url: URL, volume: Double) {
        stop()
        let player = AVPlayer(url: url)
        player.volume = Float(volume)
        player.play()
        self.player = player
    }

    public func stop() {
        if synthesizer.isSpeaking { synthesizer.stopSpeaking(at: .immediate) }
        player?.pause()
        player = nil
    }
}
