import Foundation
import Testing

@testable import September

@Suite("OpenAITTSService")
struct OpenAITTSServiceTests {

    @Test("Static voices list contains expected voices")
    func staticVoices() async throws {
        let service = OpenAITTSService(apiKey: "test-key")
        let voices = try await service.voices()

        #expect(voices.count == 6)

        let ids = voices.map(\.id)
        #expect(ids.contains("alloy"))
        #expect(ids.contains("echo"))
        #expect(ids.contains("nova"))
        #expect(ids.contains("shimmer"))
    }

    @Test("Voices have name and language")
    func voiceFields() async throws {
        let service = OpenAITTSService(apiKey: "test-key")
        let voices = try await service.voices()

        for voice in voices {
            #expect(!voice.id.isEmpty)
            #expect(!voice.name.isEmpty)
            #expect(!voice.language.isEmpty)
        }
    }
}
