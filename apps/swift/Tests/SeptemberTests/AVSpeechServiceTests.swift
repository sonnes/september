import AVFoundation
import Testing

@testable import September

@Suite("AVSpeechService")
struct AVSpeechServiceTests {

    @Test("Voices list is non-empty")
    @MainActor
    func voicesNonEmpty() async {
        let service = AVSpeechService()
        let voices = await service.voices()
        #expect(!voices.isEmpty)
    }

    @Test("Voices have required fields")
    @MainActor
    func voiceFields() async {
        let service = AVSpeechService()
        let voices = await service.voices()
        guard let first = voices.first else {
            Issue.record("No voices available")
            return
        }
        #expect(!first.id.isEmpty)
        #expect(!first.name.isEmpty)
        #expect(!first.language.isEmpty)
    }

    @Test("Speak does not throw for valid text")
    @MainActor
    func speakDoesNotThrow() async throws {
        let service = AVSpeechService()
        // Use a short text so the test completes quickly
        try await service.speak(text: "Hi")
    }

    @Test("Speak with empty text is a no-op")
    @MainActor
    func speakEmptyText() async throws {
        let service = AVSpeechService()
        try await service.speak(text: "")
        #expect(service.isSpeaking == false)
    }
}
