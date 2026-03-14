import Foundation
import os

// MARK: - HTTPClient
//
// Shared request execution + HTTP status mapping for AI service actors.
// Each service builds its own URLRequest; HTTPClient handles the plumbing.
//
// Error mapping:
//   401         → AIServiceError.invalidAPIKey
//   429, 5xx    → AIServiceError.httpError(statusCode, message)
//   URLError    → AIServiceError.networkError
//
// SECURITY: Never logs API keys or authorization headers.

struct HTTPClient: Sendable {
    private static let logger = Logger(subsystem: "to.september.app", category: "HTTPClient")

    func execute(request: URLRequest, session: URLSession = .shared) async throws -> Data {
        let start = ContinuousClock.now

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            Self.logger.error("Network error: \(error.localizedDescription)")
            throw AIServiceError.networkError(error)
        }

        let elapsed = ContinuousClock.now - start
        let url = request.url?.host() ?? "unknown"

        guard let http = response as? HTTPURLResponse else {
            Self.logger.error("Non-HTTP response from \(url)")
            throw AIServiceError.invalidResponse
        }

        let status = http.statusCode
        Self.logger.debug("\(url) → \(status) (\(elapsed))")

        switch status {
        case 200...299:
            return data
        case 401:
            throw AIServiceError.invalidAPIKey
        default:
            let message = String(data: data.prefix(200), encoding: .utf8) ?? "Unknown error"
            throw AIServiceError.httpError(statusCode: status, message: message)
        }
    }
}
