import Foundation

// MARK: - Provider Enums
//
// Split into 3 domain-specific enums to prevent invalid states.
// e.g., SuggestionsConfig can only reference AIProvider, not SpeechProvider.

enum AIProvider: String, Codable, Sendable, CaseIterable {
    case openai
    case anthropic
    case ollama
    case foundationModels
}

enum SpeechProvider: String, Codable, Sendable, CaseIterable {
    case avSpeech
    case openaiTTS
    case elevenlabs
}

enum TranscriptionProvider: String, Codable, Sendable, CaseIterable {
    case appleSpeech
    case whisper
    case whisperCpp
}

// MARK: - AI Suggestions Config
// Mirrors: packages/account/types/index.ts → SuggestionsConfigSchema

struct SuggestionsConfig: Codable, Sendable {
    var enabled: Bool = false
    var provider: AIProvider = .openai
    var model: String? = nil
    var temperature: Double = 0.7
    var maxSuggestions: Int = 5
    var contextWindow: Int = 10
    var systemInstructions: String? = nil
}

// MARK: - Transcription Config
// Mirrors: packages/account/types/index.ts → TranscriptionConfigSchema

struct TranscriptionConfig: Codable, Sendable {
    var enabled: Bool = false
    var provider: TranscriptionProvider = .appleSpeech
    var model: String? = nil
    var language: String? = nil
    var detectLanguage: Bool = true
    var autoPunctuation: Bool = true
    var continuousListening: Bool = false
}

// MARK: - Speech Config
// Mirrors: packages/account/types/index.ts → SpeechConfigSchema

struct SpeechConfig: Codable, Sendable {
    var enabled: Bool = true
    var provider: SpeechProvider = .avSpeech
    var voiceId: String? = nil
    var voiceName: String? = nil
    var speed: Double = 1.0
    var pitch: Double = 1.0
    var volume: Double = 1.0
    var language: String = "en-US"
}
