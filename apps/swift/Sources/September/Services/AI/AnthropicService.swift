import Foundation
import os

// MARK: - Anthropic Service
//
// URLSession-based client for Anthropic Messages API.
// Uses shared HTTPClient for request execution and error mapping.

actor AnthropicService: AIService {
    private let apiKey: String
    private let model: String
    private let session: URLSession
    private let httpClient = HTTPClient()
    private static let logger = Logger(subsystem: "to.september.app", category: "Anthropic")

    init(apiKey: String, model: String = "claude-sonnet-4-20250514", session: URLSession = .shared) {
        self.apiKey = apiKey
        self.model = model
        self.session = session
    }

    func generateText(prompt: String, system: String?, temperature: Double) async throws -> String {
        var body: [String: Any] = [
            "model": model,
            "max_tokens": 1024,
            "messages": [["role": "user", "content": prompt]],
            "temperature": temperature,
        ]
        if let system {
            body["system"] = system
        }

        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let data = try await httpClient.execute(request: request, session: session)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let content = json["content"] as? [[String: Any]],
            let first = content.first,
            let text = first["text"] as? String
        else {
            Self.logger.error("Failed to parse Anthropic response")
            throw AIServiceError.invalidResponse
        }

        return text
    }
}
