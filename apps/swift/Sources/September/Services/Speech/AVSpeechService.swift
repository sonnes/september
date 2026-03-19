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

    func speak(text: String, voiceId: String?, speed: Double) async throws {
        guard !text.isEmpty else { return }

        if synthesizer.isSpeaking {
            speakContinuation?.resume()
            speakContinuation = nil
            synthesizer.stopSpeaking(at: .immediate)
        }

        let utterance = AVSpeechUtterance(string: text)

        if let voiceId, let voice = AVSpeechSynthesisVoice(identifier: voiceId) {
            utterance.voice = voice
        } else {
            utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        }

        // Map user speed (0.5–2.0) to AVSpeech rate.
        // AVSpeechUtteranceDefaultSpeechRate is ~0.5 on the 0.0–1.0 scale.
        let clampedSpeed = min(max(speed, 0.5), 2.0)
        utterance.rate = Float(clampedSpeed) * AVSpeechUtteranceDefaultSpeechRate

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
