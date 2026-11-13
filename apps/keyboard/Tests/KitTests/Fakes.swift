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

/// Records what would have been posted, so key handling is testable without
/// injecting real events into whatever app happens to be frontmost.
final class RecordingSink: KeystrokeSink, @unchecked Sendable {
    var posted: [Keystroke] = []
    var typed: [String] = []
    var beeps = 0
    var media: [MediaKey] = []
    var scrolls: [(direction: ScrollDirection, point: CGPoint)] = []

    func post(_ events: [Keystroke]) { posted.append(contentsOf: events) }
    func scroll(_ direction: ScrollDirection, at point: CGPoint) { scrolls.append((direction, point)) }
    func post(media key: MediaKey) { media.append(key) }
    func type(_ text: String) { typed.append(text) }
    func beep() { beeps += 1 }

    func reset() {
        posted = []
        typed = []
        beeps = 0
        media = []
        scrolls = []
    }

    var downs: [(key: UInt16, flags: Modifiers)] {
        posted.filter(\.isDown).map { ($0.virtualKey, $0.flags) }
    }
}

@MainActor
final class FakeClock: DelayScheduler {
    private final class Item: ScheduledWork {
        let at: TimeInterval
        let order: Int
        let work: @MainActor () -> Void
        var isCancelled = false

        init(at: TimeInterval, order: Int, work: @escaping @MainActor () -> Void) {
            self.at = at
            self.order = order
            self.work = work
        }

        func cancel() { isCancelled = true }
    }

    private(set) var now: TimeInterval = 0
    private var items: [Item] = []
    private var order = 0

    func schedule(after delay: TimeInterval, _ work: @escaping @MainActor () -> Void) -> any ScheduledWork {
        order += 1
        let item = Item(at: now + delay, order: order, work: work)
        items.append(item)
        return item
    }

    func advance(to time: TimeInterval) {
        while let next = items
            .filter({ !$0.isCancelled && $0.at <= time })
            .min(by: { ($0.at, $0.order) < ($1.at, $1.order) })
        {
            items.removeAll { $0 === next }
            now = next.at
            next.work()
        }
        now = time
    }
}

@MainActor
final class FakeEngine: SpeechEngine {
    var ready = true
    var spoken: [String] = []
    var stops = 0
    var words: [NSRange] = []
    var failure: (any Error)?
    /// When true, `speak` waits until `finish()` or `stop()`.
    var holds = false
    /// The number of calls to `speak` that returned or threw.
    private(set) var ended = 0
    private var waiting: CheckedContinuation<Void, any Error>?
    private var waiters: [(ready: () -> Bool, go: CheckedContinuation<Void, Never>)] = []

    func canSpeak(_ voice: VoiceSettings) -> Bool { ready }

    func speak(
        _ text: String, voice: VoiceSettings, onWord: @escaping @MainActor (NSRange) -> Void
    ) async throws {
        spoken.append(text)
        for word in words { onWord(word) }
        // The caller continues in the same job after the return, so it is
        // done before a waiter that this signal resumes.
        defer {
            ended += 1
            signal()
        }
        if let failure { throw failure }
        guard holds else { return }
        signal()
        try await withCheckedThrowingContinuation { waiting = $0 }
    }

    /// Returns when `speak` got `count` texts.
    func waitUntilSpoken(_ count: Int) async {
        await wait { self.spoken.count >= count }
    }

    /// Returns when `count` calls to `speak` ended, and the speaker handled
    /// the end.
    func waitUntilEnded(_ count: Int) async {
        await wait { self.ended >= count }
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

    func stop() {
        stops += 1
        waiting?.resume(throwing: CancellationError())
        waiting = nil
    }

    func finish() {
        waiting?.resume()
        waiting = nil
    }
}

/// Private text for the tests. The tests never touch the Keychain.
final class MemoryPrivateTexts: PrivateTextStore, @unchecked Sendable {
    var texts: [String: String] = [:]
    /// The error that each read throws, as a locked Keychain does.
    var readError: (any Error)?

    func text(for id: String) throws -> String? {
        if let readError { throw readError }
        return texts[id]
    }
    func setText(_ text: String, for id: String) throws { texts[id] = text }
    func removeText(for id: String) throws { texts[id] = nil }
}
