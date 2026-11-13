import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

/// Sentence predictions from the on-device model of Apple Intelligence.
///
/// It builds on macOS 14. Before macOS 26, or with no `FoundationModels` in
/// the SDK, the availability is `notSupported`.
public struct AppleIntelligencePredictor: SentencePredicting {
    public enum Failure: Error {
        case notSupported
    }

    public init() {}

    public var availability: PredictionAvailability {
        #if canImport(FoundationModels)
        if #available(macOS 26, *) {
            return FoundationModelsPredictor.availability
        }
        #endif
        return .notSupported
    }

    public func predictions(for context: PredictionContext) async throws -> [String] {
        #if canImport(FoundationModels)
        if #available(macOS 26, *) {
            return try await FoundationModelsPredictor.predictions(for: SuggestionPrompt(context: context))
        }
        #endif
        throw Failure.notSupported
    }
}

#if canImport(FoundationModels)
@available(macOS 26, *)
enum FoundationModelsPredictor {
    static var availability: PredictionAvailability {
        switch SystemLanguageModel.default.availability {
        case .available:
            return .ready
        case .unavailable(.appleIntelligenceNotEnabled):
            return .off
        case .unavailable(.modelNotReady):
            return .modelNotReady
        case .unavailable:
            return .notSupported
        }
    }

    static func predictions(for prompt: SuggestionPrompt) async throws -> [String] {
        // A new session for each request, so one request never sees another.
        let session = LanguageModelSession(instructions: prompt.instructions)
        let response = try await session.respond(to: prompt.prompt, schema: try schema(for: prompt))
        return try response.content.value([String].self, forProperty: "predictions")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    /// Exactly `SuggestionPrompt.count` strings. A free-form prompt for that count
    /// of lines often gives one line. Each string starts with the answer prefix.
    /// The guide supports a literal and `.*` only, with no character classes.
    /// The prefix holds only letters and apostrophes, so it needs no escape.
    private static func schema(for prompt: SuggestionPrompt) throws -> GenerationSchema {
        let guides: [GenerationGuide<String>] =
            prompt.answerPrefix.isEmpty ? [] : [.pattern(try Regex(prompt.answerPrefix + ".*"))]
        let row = DynamicGenerationSchema(type: String.self, guides: guides)
        let answer = DynamicGenerationSchema(
            name: "Answer",
            properties: [
                .init(
                    name: "predictions", description: "The predictions, best first",
                    schema: DynamicGenerationSchema(
                        arrayOf: row, minimumElements: SuggestionPrompt.count,
                        maximumElements: SuggestionPrompt.count))
            ])
        return try GenerationSchema(root: answer, dependencies: [])
    }
}
#endif
