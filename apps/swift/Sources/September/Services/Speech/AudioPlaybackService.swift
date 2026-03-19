import AVFoundation
import Foundation

// MARK: - AudioPlaybackService
//
// Plays audio data (MP3/AAC) returned by cloud TTS providers.
// Wraps AVAudioPlayer with observable isSpeaking state for UI binding.

@MainActor
@Observable
final class AudioPlaybackService: NSObject, AVAudioPlayerDelegate {
    private(set) var isSpeaking = false
    private var player: AVAudioPlayer?
    private var playbackContinuation: CheckedContinuation<Void, Never>?

    func play(data: Data) async throws {
        stop()

        let audioPlayer = try AVAudioPlayer(data: data)
        audioPlayer.delegate = self
        player = audioPlayer

        isSpeaking = true
        await withCheckedContinuation { continuation in
            playbackContinuation = continuation
            audioPlayer.play()
        }
    }

    func stop() {
        player?.stop()
        player = nil
        isSpeaking = false
        playbackContinuation?.resume()
        playbackContinuation = nil
    }

    // MARK: - AVAudioPlayerDelegate

    nonisolated func audioPlayerDidFinishPlaying(
        _ player: AVAudioPlayer,
        successfully flag: Bool
    ) {
        Task { @MainActor in
            isSpeaking = false
            self.player = nil
            playbackContinuation?.resume()
            playbackContinuation = nil
        }
    }

    nonisolated func audioPlayerDecodeErrorDidOccur(
        _ player: AVAudioPlayer,
        error: (any Error)?
    ) {
        Task { @MainActor in
            isSpeaking = false
            self.player = nil
            playbackContinuation?.resume()
            playbackContinuation = nil
        }
    }
}
