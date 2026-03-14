import Foundation

// MARK: - AIServiceError
//
// Errors from AI service network calls. Used by HTTPClient,
// concrete service actors, and PredictionEngine.
//
// SECURITY: Descriptions never include full API keys.
// Use Account.maskedAPIKey(for:) for display.

enum AIServiceError: Error, Sendable {
    case invalidAPIKey
    case networkError(any Error)
    case invalidResponse
    case httpError(statusCode: Int, message: String)
    case providerUnavailable

    var isAuthError: Bool {
        switch self {
        case .invalidAPIKey: return true
        default: return false
        }
    }
}

extension AIServiceError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .invalidAPIKey:
            return "Invalid API key. Check your key in Settings."
        case .networkError(let underlying):
            return "Network error: \(underlying.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from AI provider."
        case .httpError(let code, let message):
            return "HTTP \(code): \(message)"
        case .providerUnavailable:
            return "AI provider is not available. Check Settings."
        }
    }
}
