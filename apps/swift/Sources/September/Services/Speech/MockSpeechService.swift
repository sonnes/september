import Foundation

// MARK: - MockSpeechService
//
// Logs to console instead of producing audio. For development and testing.

@MainActor
@Observable
final class MockSpeechService: SpeechService {
    private(set) var isSpeaking = false
    private(set) var lastVoiceId: String?
    private(set) var lastSpeed: Double?

    func speak(text: String, voiceId: String?, speed: Double) async throws {
        isSpeaking = true
        lastVoiceId = voiceId
        lastSpeed = speed
        print("[MockSpeechService] Speaking: \(text) voice=\(voiceId ?? "nil") speed=\(speed)")
        try await Task.sleep(for: .milliseconds(500))
        isSpeaking = false
    }

    func voices() async -> [Voice] {
        [
            Voice(id: "mock-1", name: "Mock Voice", language: "en-US"),
        ]
    }

    func stop() async {
        isSpeaking = false
        print("[MockSpeechService] Stopped")
    }
}
