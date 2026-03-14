import Foundation
import Testing

@testable import September

// MARK: - Mock URLProtocol for testing HTTP responses

final class MockURLProtocol: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.requestHandler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

func makeMockSession() -> URLSession {
    let config = URLSessionConfiguration.ephemeral
    config.protocolClasses = [MockURLProtocol.self]
    return URLSession(configuration: config)
}

func makeHTTPResponse(url: String = "https://api.example.com", statusCode: Int) -> HTTPURLResponse {
    HTTPURLResponse(url: URL(string: url)!, statusCode: statusCode, httpVersion: nil, headerFields: nil)!
}

@Suite("HTTPClient", .serialized)
struct HTTPClientTests {

    let client = HTTPClient()

    @Test("Successful 200 response returns data")
    func success200() async throws {
        let expected = Data("hello".utf8)
        MockURLProtocol.requestHandler = { _ in
            (makeHTTPResponse(statusCode: 200), expected)
        }

        let request = URLRequest(url: URL(string: "https://api.example.com/test")!)
        let data = try await client.execute(request: request, session: makeMockSession())
        #expect(data == expected)
    }

    @Test("401 maps to invalidAPIKey")
    func error401() async {
        MockURLProtocol.requestHandler = { _ in
            (makeHTTPResponse(statusCode: 401), Data("unauthorized".utf8))
        }

        let request = URLRequest(url: URL(string: "https://api.example.com/test")!)
        do {
            _ = try await client.execute(request: request, session: makeMockSession())
            Issue.record("Expected invalidAPIKey error")
        } catch let error as AIServiceError {
            #expect(error.isAuthError)
        } catch {
            Issue.record("Unexpected error type: \(error)")
        }
    }

    @Test("429 maps to httpError with rate limit")
    func error429() async {
        MockURLProtocol.requestHandler = { _ in
            (makeHTTPResponse(statusCode: 429), Data("rate limited".utf8))
        }

        let request = URLRequest(url: URL(string: "https://api.example.com/test")!)
        do {
            _ = try await client.execute(request: request, session: makeMockSession())
            Issue.record("Expected httpError")
        } catch let error as AIServiceError {
            if case .httpError(let code, _) = error {
                #expect(code == 429)
            } else {
                Issue.record("Expected httpError, got \(error)")
            }
        } catch {
            Issue.record("Unexpected error type: \(error)")
        }
    }

    @Test("500 maps to httpError")
    func error500() async {
        MockURLProtocol.requestHandler = { _ in
            (makeHTTPResponse(statusCode: 500), Data("server error".utf8))
        }

        let request = URLRequest(url: URL(string: "https://api.example.com/test")!)
        do {
            _ = try await client.execute(request: request, session: makeMockSession())
            Issue.record("Expected httpError")
        } catch let error as AIServiceError {
            if case .httpError(let code, _) = error {
                #expect(code == 500)
            } else {
                Issue.record("Expected httpError, got \(error)")
            }
        } catch {
            Issue.record("Unexpected error type: \(error)")
        }
    }

    @Test("Network error maps to networkError")
    func networkError() async {
        MockURLProtocol.requestHandler = { _ in
            throw URLError(.notConnectedToInternet)
        }

        let request = URLRequest(url: URL(string: "https://api.example.com/test")!)
        do {
            _ = try await client.execute(request: request, session: makeMockSession())
            Issue.record("Expected networkError")
        } catch let error as AIServiceError {
            if case .networkError = error {
                // Expected
            } else {
                Issue.record("Expected networkError, got \(error)")
            }
        } catch {
            Issue.record("Unexpected error type: \(error)")
        }
    }
}
