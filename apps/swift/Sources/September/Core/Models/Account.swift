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
        self.termsAccepted = termsAccepted
        self.privacyPolicyAccepted = privacyPolicyAccepted
        self.onboardingCompleted = onboardingCompleted
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}
