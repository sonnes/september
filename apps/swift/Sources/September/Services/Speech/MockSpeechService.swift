import Foundation

// MARK: - MockSpeechService
//
// Logs to console instead of producing audio. For development and testing.

@MainActor
@Observable
final class MockSpeechService: SpeechService {
    private(set) var isSpeaking = false

    func speak(text: String) async throws {
        isSpeaking = true
        print("[MockSpeechService] Speaking: \(text)")
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
