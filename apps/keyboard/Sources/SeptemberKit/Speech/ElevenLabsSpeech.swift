import AVFoundation
import Foundation

/// Speaks with an ElevenLabs voice, and marks each word from the times that
/// ElevenLabs sends with the audio.
@MainActor
public final class ElevenLabsSpeech: SpeechEngine {
    /// How often the current word is checked during playback.
    static let tick: Duration = .milliseconds(30)

    private let account: ElevenLabsAccount
    private var player: AVAudioPlayer?

    public init(account: ElevenLabsAccount) {
        self.account = account
    }

    public func canSpeak(_ voice: VoiceSettings) -> Bool {
        account.key != nil && voice.elevenLabsVoiceID != nil
    }

    public func speak(
        _ text: String, voice: VoiceSettings, onWord: @escaping @MainActor (NSRange) -> Void
    ) async throws {
        guard let key = account.key else { throw ElevenLabsError.notConnected }
        let speech = try await account.client.speech(text, settings: voice, key: key)
        try Task.checkCancellation()

        let player: AVAudioPlayer
        do {
            player = try AVAudioPlayer(data: speech.audio)
        } catch {
            throw ElevenLabsError.badResponse
        }
        player.volume = Float(voice.volume)
        self.player = player
        defer {
            player.stop()
            if self.player === player { self.player = nil }
        }
        guard player.play() else { throw ElevenLabsError.badResponse }

        var last: NSRange?
        while player.isPlaying {
            if let word = speech.words.word(at: player.currentTime), word != last {
                last = word
                onWord(word)
            }
            try await Task.sleep(for: Self.tick)
        }
    }

    public func stop() {
        player?.stop()
        player = nil
    }
}
