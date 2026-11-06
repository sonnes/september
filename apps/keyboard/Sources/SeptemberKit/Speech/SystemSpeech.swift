import AVFoundation
import Foundation

/// The macOS voices, which include Personal Voice. Nothing leaves the Mac.
@MainActor
public final class SystemSpeech: NSObject, SpeechEngine {
    private let synthesizer = AVSpeechSynthesizer()
    private var current: ObjectIdentifier?
    private var continuation: CheckedContinuation<Void, any Error>?
    private var onWord: (@MainActor (NSRange) -> Void)?

    public override init() {
        super.init()
        synthesizer.delegate = self
    }

    public func canSpeak(_ voice: VoiceSettings) -> Bool { true }

    public func speak(
        _ text: String, voice: VoiceSettings, onWord: @escaping @MainActor (NSRange) -> Void
    ) async throws {
        stop()
        let utterance = Self.utterance(text, voice: voice)
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                self.continuation = continuation
                self.onWord = onWord
                self.current = ObjectIdentifier(utterance)
                synthesizer.speak(utterance)
            }
        } onCancel: {
            Task { @MainActor in self.stop() }
        }
    }

    public func stop() {
        current = nil
        if synthesizer.isSpeaking { synthesizer.stopSpeaking(at: .immediate) }
        finish(throwing: CancellationError())
    }

    /// An utterance with the voice, the speed, and the volume of the settings.
    /// Speed 1 is the default rate of macOS.
    static func utterance(_ text: String, voice: VoiceSettings) -> AVSpeechUtterance {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice.systemVoiceID.flatMap(AVSpeechSynthesisVoice.init(identifier:))
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * Float(voice.speed)
        utterance.volume = Float(voice.volume)
        return utterance
    }

    private func finish(throwing error: (any Error)? = nil) {
        guard let continuation else { return }
        self.continuation = nil
        onWord = nil
        if let error { continuation.resume(throwing: error) } else { continuation.resume() }
    }

    fileprivate func word(_ range: NSRange, in utterance: ObjectIdentifier) {
        guard utterance == current else { return }
        onWord?(range)
    }

    fileprivate func ended(_ utterance: ObjectIdentifier) {
        guard utterance == current else { return }
        current = nil
        finish()
    }
}

/// The synthesizer calls its delegate on a thread of its own. Each call moves
/// to the main queue, in order, before it touches the engine.
extension SystemSpeech: AVSpeechSynthesizerDelegate {
    public nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer, willSpeakRangeOfSpeechString characterRange: NSRange,
        utterance: AVSpeechUtterance
    ) {
        let id = ObjectIdentifier(utterance)
        DispatchQueue.main.async { MainActor.assumeIsolated { self.word(characterRange, in: id) } }
    }

    public nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        let id = ObjectIdentifier(utterance)
        DispatchQueue.main.async { MainActor.assumeIsolated { self.ended(id) } }
    }

    public nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        let id = ObjectIdentifier(utterance)
        DispatchQueue.main.async { MainActor.assumeIsolated { self.ended(id) } }
    }
}
