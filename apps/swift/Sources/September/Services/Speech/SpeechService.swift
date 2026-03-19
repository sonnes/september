import Foundation

// MARK: - SpeechService Protocol
//
// Abstraction for text-to-speech. Concrete implementations:
// - AVSpeechService (Phase 0, zero-config baseline)
// - OpenAI TTS, ElevenLabs via TTSAPIService (Phase 3+)
//
// Must run on MainActor because AVSpeechSynthesizer requires it.

protocol SpeechService: Sendable {
    func speak(text: String, voiceId: String?, speed: Double) async throws
    func voices() async -> [Voice]
    func stop() async
}

extension SpeechService {
    func speak(text: String) async throws {
        try await speak(text: text, voiceId: nil, speed: 1.0)
    }
}
