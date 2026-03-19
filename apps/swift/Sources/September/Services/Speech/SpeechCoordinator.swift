import Foundation
import os

// MARK: - SpeechCoordinator
//
// Unified TTS interface that routes between AVSpeech (direct synthesis)
// and API-based providers (OpenAI TTS, ElevenLabs → AudioPlaybackService).
//
// Owns the AVSpeechService and AudioPlaybackService instances.
// UI binds to isSpeaking for visual feedback.

@MainActor
@Observable
final class SpeechCoordinator {
    private(set) var isSpeaking = false
    private let avSpeechService = AVSpeechService()
    private let audioPlayback = AudioPlaybackService()
    private var currentTask: Task<Void, Never>?
    private static let logger = Logger(
        subsystem: "to.september.app", category: "SpeechCoordinator")

    func speak(text: String, config: SpeechConfig, apiKey: String?) {
        stop()

        currentTask = Task {
            isSpeaking = true
            defer {
                isSpeaking = false
                currentTask = nil
            }

            do {
                switch config.provider {
                case .avSpeech:
                    try await avSpeechService.speak(
                        text: text, voiceId: config.voiceId, speed: config.speed)

                case .openaiTTS:
                    guard let apiKey, !apiKey.isEmpty else {
                        Self.logger.warning("OpenAI TTS requires API key")
                        return
                    }
                    let service = OpenAITTSService(apiKey: apiKey)
                    let data = try await service.synthesize(
                        text: text, voiceId: config.voiceId, speed: config.speed)
                    guard !Task.isCancelled else { return }
                    try await audioPlayback.play(data: data)

                case .elevenlabs:
                    guard let apiKey, !apiKey.isEmpty else {
                        Self.logger.warning("ElevenLabs requires API key")
                        return
                    }
                    let service = ElevenLabsTTSService(apiKey: apiKey)
                    let data = try await service.synthesize(
                        text: text, voiceId: config.voiceId, speed: config.speed)
                    guard !Task.isCancelled else { return }
                    try await audioPlayback.play(data: data)
                }
            } catch {
                Self.logger.error("Speech failed: \(error.localizedDescription)")
            }
        }
    }

    func stop() {
        currentTask?.cancel()
        currentTask = nil

        Task { @MainActor in
            await avSpeechService.stop()
        }
        audioPlayback.stop()
        isSpeaking = false
    }

    func voices(for provider: SpeechProvider, apiKey: String?) async -> [Voice] {
        switch provider {
        case .avSpeech:
            return await avSpeechService.voices()

        case .openaiTTS:
            return OpenAITTSService.availableVoices

        case .elevenlabs:
            guard let apiKey, !apiKey.isEmpty else { return [] }
            let service = ElevenLabsTTSService(apiKey: apiKey)
            return (try? await service.voices()) ?? []
        }
    }
}
