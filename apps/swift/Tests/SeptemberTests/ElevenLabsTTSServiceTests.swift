import Foundation
import Testing

@testable import September

@Suite("ElevenLabsTTSService")
struct ElevenLabsTTSServiceTests {

    @Test("Service initializes with API key")
    func initWithApiKey() {
        let _ = ElevenLabsTTSService(apiKey: "test-key")
    }
}
