import Foundation

// MARK: - Voice
//
// Shared domain model used by SpeechService, Settings, and Account.
// Mirrors: packages/speech/types/index.ts → Voice

struct Voice: Identifiable, Sendable {
    let id: String
    let name: String
    let language: String
    let gender: String?

    init(id: String, name: String, language: String, gender: String? = nil) {
        self.id = id
        self.name = name
        self.language = language
        self.gender = gender
    }
}
