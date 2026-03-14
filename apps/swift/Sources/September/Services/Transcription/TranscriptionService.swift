import Foundation

// MARK: - TranscriptionService Protocol
//
// Abstraction for speech-to-text. Concrete implementations:
// - Apple Speech (Phase 4)
// - Whisper / Whisper.cpp (Phase 4)
//
// Uses AsyncStream for results to work cleanly with strict concurrency.

protocol TranscriptionService: Sendable {
    func startListening() async throws
    func stopListening() async
    var transcriptionStream: AsyncStream<String> { get }
}
