import Combine
import Foundation

/// A voice that speaks one text at a time.
@MainActor
public protocol SpeechEngine: AnyObject {
    /// True when the engine has what it needs to speak with these settings.
    func canSpeak(_ voice: VoiceSettings) -> Bool
    /// Speaks `text` and returns when the speech ends. `onWord` gets the
    /// UTF-16 range of each word as the voice starts it. A cancelled task or
    /// `stop()` ends the speech.
    func speak(_ text: String, voice: VoiceSettings, onWord: @escaping @MainActor (NSRange) -> Void) async throws
    func stop()
}

/// A speech that failed, in words for the user.
public struct SpeechError: Error, Equatable, Sendable {
    public let message: String

    public init(message: String) {
        self.message = message
    }
}

/// Speaks a text with the voice of the settings.
///
/// If ElevenLabs fails, the macOS voice speaks the same text, and `error`
/// says why ElevenLabs failed.
@MainActor
public final class Speaker: ObservableObject {
    public enum State: Equatable, Sendable {
        case idle
        /// `word` is the UTF-16 range of the current word in `text`, or `nil`
        /// before the first word.
        case speaking(text: String, word: NSRange?)
    }

    @Published public private(set) var state: State = .idle
    /// Why ElevenLabs failed during the last speech. A new speech clears it.
    @Published public private(set) var error: SpeechError?

    private let settings: VoiceSettingsStore
    private let system: any SpeechEngine
    private let elevenLabs: any SpeechEngine
    private var task: Task<Void, Never>?
    private var active: (any SpeechEngine)?
    /// Each speech has a new number, so an old speech that ends late does not
    /// change the state of the new one.
    private var generation = 0

    public init(settings: VoiceSettingsStore, system: any SpeechEngine, elevenLabs: any SpeechEngine) {
        self.settings = settings
        self.system = system
        self.elevenLabs = elevenLabs
    }

    public var isSpeaking: Bool { state != .idle }

    public var currentWord: NSRange? {
        if case .speaking(_, let word) = state { return word }
        return nil
    }

    /// Speaks `text`. A speech in progress stops first.
    public func speak(_ text: String) {
        stop()
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        error = nil
        state = .speaking(text: text, word: nil)
        let voice = settings.value
        let number = generation
        task = Task { [weak self] in
            await self?.run(text, voice: voice, generation: number)
        }
    }

    /// Ends the speech at once.
    public func stop() {
        generation += 1
        task?.cancel()
        task = nil
        active?.stop()
        active = nil
        state = .idle
    }

    private func run(_ text: String, voice: VoiceSettings, generation number: Int) async {
        let onWord: @MainActor (NSRange) -> Void = { [weak self] word in
            guard let self, self.generation == number else { return }
            self.state = .speaking(text: text, word: word)
        }
        if voice.provider == .elevenLabs, elevenLabs.canSpeak(voice) {
            do {
                try await speak(text, with: elevenLabs, voice: voice, onWord: onWord)
                return finish(number)
            } catch {
                guard generation == number, !Task.isCancelled, !(error is CancellationError) else { return }
                self.error = SpeechError(message: Self.message(error))
                state = .speaking(text: text, word: nil)
            }
        }
        try? await speak(text, with: system, voice: voice, onWord: onWord)
        finish(number)
    }

    private func speak(
        _ text: String, with engine: any SpeechEngine, voice: VoiceSettings,
        onWord: @escaping @MainActor (NSRange) -> Void
    ) async throws {
        active = engine
        try await engine.speak(text, voice: voice, onWord: onWord)
    }

    private func finish(_ number: Int) {
        guard generation == number else { return }
        active = nil
        task = nil
        state = .idle
    }

    private static func message(_ error: any Error) -> String {
        (error as? ElevenLabsError)?.message ?? ElevenLabsError.unreachable.message
    }
}
