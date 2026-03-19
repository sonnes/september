import Foundation
import os

// MARK: - OpenAI TTS Service
//
// URLSession-based client for OpenAI's Text-to-Speech API.
// Returns MP3 audio data for playback via AudioPlaybackService.
//
// API: POST https://api.openai.com/v1/audio/speech
// Voices: alloy, echo, fable, onyx, nova, shimmer

actor OpenAITTSService: TTSAPIService {
    private let apiKey: String
    private let session: URLSession
    private let httpClient = HTTPClient()
    private static let logger = Logger(subsystem: "to.september.app", category: "OpenAITTS")

    static let availableVoices: [Voice] = [
        Voice(id: "alloy", name: "Alloy", language: "en"),
        Voice(id: "echo", name: "Echo", language: "en"),
        Voice(id: "fable", name: "Fable", language: "en"),
        Voice(id: "onyx", name: "Onyx", language: "en"),
        Voice(id: "nova", name: "Nova", language: "en"),
        Voice(id: "shimmer", name: "Shimmer", language: "en"),
    ]

    init(apiKey: String, session: URLSession = .shared) {
        self.apiKey = apiKey
        self.session = session
    }

    func synthesize(text: String, voiceId: String?, speed: Double) async throws -> Data {
        let voice = voiceId ?? "alloy"
        let clampedSpeed = min(max(speed, 0.25), 4.0)

        let body: [String: Any] = [
            "model": "tts-1",
            "input": text,
            "voice": voice,
            "speed": clampedSpeed,
        ]

        var request = URLRequest(url: URL(string: "https://api.openai.com/v1/audio/speech")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        return try await httpClient.execute(request: request, session: session)
    }

    func voices() async throws -> [Voice] {
        Self.availableVoices
    }
}
