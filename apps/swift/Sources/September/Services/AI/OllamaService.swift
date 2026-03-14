import Foundation
import os

// MARK: - Ollama Service
//
// URLSession-based client for Ollama local API (localhost:11434).
// No API key required. Also provides listModels() for dynamic model discovery.

actor OllamaService: AIService {
    private let model: String
    private let baseURL: String
    private let session: URLSession
    private let httpClient = HTTPClient()
    private static let logger = Logger(subsystem: "to.september.app", category: "Ollama")

    init(model: String = "llama3", baseURL: String = "http://localhost:11434", session: URLSession = .shared) {
        self.model = model
        self.baseURL = baseURL
        self.session = session
    }

    func generateText(prompt: String, system: String?, temperature: Double) async throws -> String {
        var body: [String: Any] = [
            "model": model,
            "prompt": prompt,
            "stream": false,
            "options": ["temperature": temperature],
        ]
        if let system {
            body["system"] = system
        }

        var request = URLRequest(url: URL(string: "\(baseURL)/api/generate")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let data: Data
        do {
            data = try await httpClient.execute(request: request, session: session)
        } catch let error as AIServiceError {
            if case .networkError = error {
                Self.logger.error("Ollama not running at \(self.baseURL)")
                throw AIServiceError.providerUnavailable
            }
            throw error
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let response = json["response"] as? String
        else {
            Self.logger.error("Failed to parse Ollama response")
            throw AIServiceError.invalidResponse
        }

        return response
    }

    func listModels() async throws -> [String] {
        var request = URLRequest(url: URL(string: "\(baseURL)/api/tags")!)
        request.httpMethod = "GET"

        let data: Data
        do {
            data = try await httpClient.execute(request: request, session: session)
        } catch {
            Self.logger.error("Failed to list Ollama models")
            return []
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let models = json["models"] as? [[String: Any]]
        else {
            return []
        }

        return models.compactMap { $0["name"] as? String }
    }
}
