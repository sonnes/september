import Foundation
import SeptemberKit

/// A sentence model that records each request and answers with `answer`.
actor FakePredictor: SentencePredicting {
    nonisolated let availability: PredictionAvailability
    private let answer: @Sendable (PredictionContext) throws -> [String]
    private let wait: @Sendable (PredictionContext) -> Duration
    private(set) var requests: [PredictionContext] = []

    init(
        availability: PredictionAvailability = .ready,
        wait: @escaping @Sendable (PredictionContext) -> Duration = { _ in .zero },
        answer: @escaping @Sendable (PredictionContext) throws -> [String]
    ) {
        self.availability = availability
        self.wait = wait
        self.answer = answer
    }

    /// A model that answers with no sentences.
    init() {
        self.init(answer: { _ in [] })
    }

    func predictions(for context: PredictionContext) async throws -> [String] {
        requests.append(context)
        // Ignores cancellation, so the engine must drop a late answer itself.
        let deadline = ContinuousClock.now + wait(context)
        while ContinuousClock.now < deadline { await Task.yield() }
        return try answer(context)
    }
}

/// Completes any start of "cup", and records what the user did with a
/// picked completion.
@MainActor
final class FakeCompleter: WordCompleting {
    var wait: Duration = .zero
    private(set) var responses: [String] = []

    func completions(for context: PredictionContext) async -> [WordCompletion] {
        if wait > .zero { try? await Task.sleep(for: wait) }
        return WordCompletion(word: "cup", partial: context.partialWord).map { [$0] } ?? []
    }

    func record(_ response: WordResponse, to completion: WordCompletion) {
        responses.append("\(response) \(completion.word)")
    }
}
