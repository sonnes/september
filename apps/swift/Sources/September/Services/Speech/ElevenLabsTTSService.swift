import Foundation
import os

// MARK: - ElevenLabs TTS Service
//
// URLSession-based client for ElevenLabs Text-to-Speech API.
// Supports cloned voices. Returns MP3 audio data.
//
// API: POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
// Voices: GET https://api.elevenlabs.io/v1/voices

actor ElevenLabsTTSService: TTSAPIService {
    private let apiKey: String
    private let session: URLSession
    private let httpClient = HTTPClient()
    private static let logger = Logger(
        subsystem: "to.september.app", category: "ElevenLabsTTS")

    private static let defaultVoiceId = "21m00Tcm4TlvDq8ikWAM"  // Rachel

    init(apiKey: String, session: URLSession = .shared) {
        self.apiKey = apiKey
        self.session = session
    }

    func synthesize(text: String, voiceId: String?, speed: Double) async throws -> Data {
        let voice = voiceId ?? Self.defaultVoiceId

        let body: [String: Any] = [
            "text": text,
            "model_id": "eleven_monolingual_v1",
        ]

        guard let encodedVoice = voice.addingPercentEncoding(
            withAllowedCharacters: .urlPathAllowed),
            let url = URL(
                string: "https://api.elevenlabs.io/v1/text-to-speech/\(encodedVoice)")
        else {
            throw AIServiceError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("audio/mpeg", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        return try await httpClient.execute(request: request, session: session)
    }

    func voices() async throws -> [Voice] {
        var request = URLRequest(
            url: URL(string: "https://api.elevenlabs.io/v1/voices")!)
        request.httpMethod = "GET"
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")

        let data = try await httpClient.execute(request: request, session: session)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let voicesArray = json["voices"] as? [[String: Any]]
        else {
            Self.logger.error("Failed to parse ElevenLabs voices response")
            throw AIServiceError.invalidResponse
        }

        return voicesArray.compactMap { dict -> Voice? in
            guard let id = dict["voice_id"] as? String,
                let name = dict["name"] as? String
            else { return nil }
            return Voice(id: id, name: name, language: "en")
        }
    }
}
