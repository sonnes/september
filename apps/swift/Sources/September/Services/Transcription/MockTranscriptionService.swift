import Foundation

// MARK: - MockTranscriptionService
//
// Emits canned text at intervals for development and testing.

actor MockTranscriptionService: TranscriptionService {
    private var continuation: AsyncStream<String>.Continuation?
    private var listeningTask: Task<Void, Never>?

    nonisolated let transcriptionStream: AsyncStream<String>

    init() {
        let (stream, continuation) = AsyncStream<String>.makeStream()
        self.transcriptionStream = stream
        self.continuation = continuation
    }

    func startListening() async throws {
        listeningTask = Task { [continuation] in
            let phrases = [
                "Hello, how are you?",
                "I'm doing well, thanks.",
                "What would you like to talk about?",
            ]
            for phrase in phrases {
                guard !Task.isCancelled else { break }
                try? await Task.sleep(for: .seconds(2))
                continuation?.yield(phrase)
            }
        }
    }

    func stopListening() async {
        listeningTask?.cancel()
        listeningTask = nil
        continuation?.finish()
    }
}
