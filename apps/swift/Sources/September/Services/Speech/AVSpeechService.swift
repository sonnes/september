import AVFoundation
import Foundation

// MARK: - AVSpeechService
//
// Concrete SpeechService using AVSpeechSynthesizer.
// Zero-config TTS baseline — works out of the box with no API key.
//
// Must be @MainActor because AVSpeechSynthesizer requires main thread.
// NSObject inheritance is required for AVSpeechSynthesizerDelegate.

@MainActor
@Observable
final class AVSpeechService: NSObject, SpeechService, AVSpeechSynthesizerDelegate {
    private let synthesizer = AVSpeechSynthesizer()
    private(set) var isSpeaking = false
    private var speakContinuation: CheckedContinuation<Void, Never>?

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func speak(text: String) async throws {
        guard !text.isEmpty else { return }

        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate

        isSpeaking = true
        await withCheckedContinuation { continuation in
            speakContinuation = continuation
            synthesizer.speak(utterance)
        }
    }

    func voices() async -> [Voice] {
        AVSpeechSynthesisVoice.speechVoices().map { voice in
            Voice(
                id: voice.identifier,
                name: voice.name,
                language: voice.language
            )
        }
    }

    func stop() async {
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
    }

    // MARK: - AVSpeechSynthesizerDelegate

    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didFinish utterance: AVSpeechUtterance
    ) {
        Task { @MainActor in
            isSpeaking = false
            speakContinuation?.resume()
            speakContinuation = nil
        }
    }

    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        didCancel utterance: AVSpeechUtterance
    ) {
        Task { @MainActor in
            isSpeaking = false
            speakContinuation?.resume()
            speakContinuation = nil
        }
    }
}
