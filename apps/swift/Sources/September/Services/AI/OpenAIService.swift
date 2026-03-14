import Foundation
import os

// MARK: - OpenAI Service
//
// URLSession-based client for OpenAI Chat Completions API.
// Uses shared HTTPClient for request execution and error mapping.

actor OpenAIService: AIService {
    private let apiKey: String
    private let model: String
    private let session: URLSession
    private let httpClient = HTTPClient()
    private static let logger = Logger(subsystem: "to.september.app", category: "OpenAI")

    init(apiKey: String, model: String = "gpt-4o", session: URLSession = .shared) {
        self.apiKey = apiKey
        self.model = model
        self.session = session
    }

    func generateText(prompt: String, system: String?, temperature: Double) async throws -> String {
        var messages: [[String: String]] = []
        if let system {
            messages.append(["role": "system", "content": system])
        }
        messages.append(["role": "user", "content": prompt])

        let body: [String: Any] = [
            "model": model,
            "messages": messages,
            "temperature": temperature,
        ]

        var request = URLRequest(url: URL(string: "https://api.openai.com/v1/chat/completions")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let data = try await httpClient.execute(request: request, session: session)

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let choices = json["choices"] as? [[String: Any]],
            let first = choices.first,
            let message = first["message"] as? [String: Any],
            let content = message["content"] as? String
        else {
            Self.logger.error("Failed to parse OpenAI response")
            throw AIServiceError.invalidResponse
        }

        return content
    }
}
