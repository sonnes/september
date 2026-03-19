import Foundation
import Testing

@testable import September

@Suite("SpeechCoordinator")
struct SpeechCoordinatorTests {

    @Test("Initial state is not speaking")
    @MainActor
    func initialState() {
        let coordinator = SpeechCoordinator()
        #expect(coordinator.isSpeaking == false)
    }

    @Test("Stop when not speaking is a no-op")
    @MainActor
    func stopWhenNotSpeaking() {
        let coordinator = SpeechCoordinator()
        coordinator.stop()
        #expect(coordinator.isSpeaking == false)
    }

    @Test("AVSpeech voices are available")
    @MainActor
    func avSpeechVoices() async {
        let coordinator = SpeechCoordinator()
        let voices = await coordinator.voices(for: .avSpeech, apiKey: nil)
        #expect(!voices.isEmpty)
    }

    @Test("OpenAI TTS voices are static list")
    @MainActor
    func openaiVoices() async {
        let coordinator = SpeechCoordinator()
        let voices = await coordinator.voices(for: .openaiTTS, apiKey: "test")
        #expect(voices.count == 6)
    }

    @Test("ElevenLabs voices returns empty without API key")
    @MainActor
    func elevenlabsVoicesNoKey() async {
        let coordinator = SpeechCoordinator()
        let voices = await coordinator.voices(for: .elevenlabs, apiKey: nil)
        #expect(voices.isEmpty)
    }

    @Test("Speak with AVSpeech sets isSpeaking")
    @MainActor
    func speakAVSpeech() async throws {
        let coordinator = SpeechCoordinator()
        let config = SpeechConfig(provider: .avSpeech)
        coordinator.speak(text: "Hi", config: config, apiKey: nil)

        // Give the task a moment to start
        try await Task.sleep(for: .milliseconds(50))
        #expect(coordinator.isSpeaking == true)

        coordinator.stop()
        #expect(coordinator.isSpeaking == false)
    }
}
