import Foundation

/// The last request for sentence predictions, for the Debug panel. It holds
/// the text of the field, so it stays in memory and is never logged.
public struct PredictionTrace: Equatable, Sendable {
    /// The context that went to the model.
    public let context: PredictionContext
    /// The instructions and the prompt that went to the model.
    public let prompt: SuggestionPrompt
    /// Each answer of the model, in its order. It is empty until the model
    /// answers.
    public var answers: [String] = []
    /// The full sentences of the answers that fit the field.
    public var sentences: [String] = []
    /// The time from the request to the answer. It is `nil` until the model
    /// answers.
    public var duration: Duration?

    public init(context: PredictionContext) {
        self.context = context
        prompt = SuggestionPrompt(context: context)
    }

    /// The answers that do not fit the field.
    public var dropped: [String] {
        answers.filter { context.sentence(from: $0) == nil }
    }
}

extension PredictionTrace: CustomStringConvertible, CustomDebugStringConvertible {
    /// The description shows only counts, so a log or a test failure never
    /// prints the text of the user.
    public var description: String {
        "PredictionTrace(\(answers.count) answers, \(sentences.count) sentences)"
    }

    public var debugDescription: String { description }
}
