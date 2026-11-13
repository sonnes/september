import Foundation
import SeptemberKit

/// A sentence model that records each request and answers with `answer`.
///
/// A request for which `holds` is true waits until the test calls
/// `release()`. The wait ignores cancellation, so the engine must drop a
/// late answer itself.
actor FakePredictor: SentencePredicting {
    nonisolated let availability: PredictionAvailability
    private let answer: @Sendable (PredictionContext) throws -> [String]
    private let holds: @Sendable (PredictionContext) -> Bool
    private(set) var requests: [PredictionContext] = []
    private var held: [CheckedContinuation<Void, Never>] = []
    private var answered = 0
    private var waiters: [(ready: () -> Bool, go: CheckedContinuation<Void, Never>)] = []

    init(
        availability: PredictionAvailability = .ready,
        holds: @escaping @Sendable (PredictionContext) -> Bool = { _ in false },
        answer: @escaping @Sendable (PredictionContext) throws -> [String]
    ) {
        self.availability = availability
        self.holds = holds
        self.answer = answer
    }

    /// A model that answers with no sentences.
    init() {
        self.init(answer: { _ in [] })
    }

    func predictions(for context: PredictionContext) async throws -> [String] {
        requests.append(context)
        if holds(context) {
            await withCheckedContinuation {
                held.append($0)
                signal()
            }
        }
        defer {
            answered += 1
            signal()
        }
        return try answer(context)
    }

    /// Resumes each held request.
    func release() {
        for request in held { request.resume() }
        held = []
    }

    /// Returns when `count` requests are held.
    func waitUntilHeld(_ count: Int) async {
        await wait { self.held.count >= count }
    }

    /// Returns when `count` requests have answered. This wait resumes on
    /// the actor after the request returns, so the engine handles the
    /// answer on the main actor before the caller gets the main actor back.
    func waitUntilAnswered(_ count: Int) async {
        await wait { self.answered >= count }
    }

    private func wait(until ready: @escaping () -> Bool) async {
        if ready() { return }
        await withCheckedContinuation { waiters.append((ready, $0)) }
    }

    private func signal() {
        let ready = waiters.filter { $0.ready() }
        waiters.removeAll { $0.ready() }
        for waiter in ready { waiter.go.resume() }
    }
}

/// Completes any start of "cup", and records what the user did with a
/// picked completion. While `holds` is true, a request waits until the test
/// calls `release()`.
@MainActor
final class FakeCompleter: WordCompleting {
    var holds = false
    private(set) var responses: [String] = []
    private var held: [CheckedContinuation<Void, Never>] = []

    func completions(for context: PredictionContext) async -> [WordCompletion] {
        if holds { await withCheckedContinuation { held.append($0) } }
        return WordCompletion(word: "cup", partial: context.partialWord).map { [$0] } ?? []
    }

    func record(_ response: WordResponse, to completion: WordCompletion) {
        responses.append("\(response) \(completion.word)")
    }

    /// Resumes each held request.
    func release() {
        holds = false
        for request in held { request.resume() }
        held = []
    }
}
