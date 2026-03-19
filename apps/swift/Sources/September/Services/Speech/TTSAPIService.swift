import Foundation

// MARK: - TTSAPIService Protocol
//
// Abstraction for cloud-based TTS providers that return audio data.
// Unlike SpeechService (which plays audio directly), TTSAPIService
// returns raw audio bytes for playback via AudioPlaybackService.
//
// Implementations: OpenAITTSService, ElevenLabsTTSService

protocol TTSAPIService: Sendable {
    func synthesize(text: String, voiceId: String?, speed: Double) async throws -> Data
    func voices() async throws -> [Voice]
}
