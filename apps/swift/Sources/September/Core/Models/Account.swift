import Foundation
import SwiftData

// MARK: - Account
//
// Single user account with personal info, AI configs, and app flags.
// Mirrors: packages/account/types/index.ts → AccountSchema
//
// AI config sub-objects are stored as Codable structs. All fields have
// default values for forward-compatible JSON decoding.

@Model
final class Account {
    @Attribute(.unique) var id: String

    // Personal Information
    var name: String
    var city: String?
    var country: String?

    // Medical Information
    var primaryDiagnosis: String?
    var yearOfDiagnosis: Int?

    // AI Feature Configurations (stored as JSON via Codable)
    var aiSuggestions: SuggestionsConfig
    var aiTranscription: TranscriptionConfig
    var aiSpeech: SpeechConfig

    // API Keys — keyed by AIProvider.rawValue.
    // Stored in SwiftData (app sandbox). Keychain migration in Phase 7.
    var apiKeys: [String: String]

    // Flags
    var termsAccepted: Bool
    var privacyPolicyAccepted: Bool
    var onboardingCompleted: Bool

    // Timestamps
    var createdAt: Date
    var updatedAt: Date

    init(
        id: String = UUID().uuidString,
        name: String,
        city: String? = nil,
        country: String? = nil,
        primaryDiagnosis: String? = nil,
        yearOfDiagnosis: Int? = nil,
        aiSuggestions: SuggestionsConfig = SuggestionsConfig(),
        aiTranscription: TranscriptionConfig = TranscriptionConfig(),
        aiSpeech: SpeechConfig = SpeechConfig(),
        apiKeys: [String: String] = [:],
        termsAccepted: Bool = false,
        privacyPolicyAccepted: Bool = false,
        onboardingCompleted: Bool = false
    ) {
        self.id = id
        self.name = name
        self.city = city
        self.country = country
        self.primaryDiagnosis = primaryDiagnosis
        self.yearOfDiagnosis = yearOfDiagnosis
        self.aiSuggestions = aiSuggestions
        self.aiTranscription = aiTranscription
        self.aiSpeech = aiSpeech
        self.apiKeys = apiKeys
        self.termsAccepted = termsAccepted
        self.privacyPolicyAccepted = privacyPolicyAccepted
        self.onboardingCompleted = onboardingCompleted
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    // MARK: - API Key Helpers

    func apiKey(for provider: AIProvider) -> String? {
        let key = apiKeys[provider.rawValue]
        guard let key, !key.isEmpty else { return nil }
        return key
    }

    func setAPIKey(_ key: String, for provider: AIProvider) {
        apiKeys[provider.rawValue] = key
        updatedAt = Date()
    }

    /// Masked display: "sk-••••3xQ7". Returns nil if no key stored.
    func maskedAPIKey(for provider: AIProvider) -> String? {
        guard let key = apiKey(for: provider), key.count > 7 else {
            return apiKey(for: provider)
        }
        let prefix = key.prefix(3)
        let suffix = key.suffix(4)
        return "\(prefix)••••\(suffix)"
    }
}
