import Foundation

/// The instructions and the prompt for one prediction request.
///
/// The text comes from `packages/core/rules/prompts/suggestions.ts`, with
/// these changes for the Mac:
/// - It asks for three predictions, the rows of the stack.
/// - It has no search prompt. A press types at the caret and cannot replace
///   the typed words, so each prediction must continue them.
/// - It asks for the words after the typed words only. The on-device model
///   often drops a repeated prefix, so `PredictionContext.sentence(from:)`
///   accepts both forms.
/// - Type mode asks for written text, because the user writes into an app.
/// - Guided generation gives the shape of the answer, so there is no JSON
///   line. It also makes each answer start with `answerPrefix`.
/// - In Type mode, the prompt can hold the app, the window, and the text near
///   the field (`ScreenContext`).
public struct SuggestionPrompt: Equatable, Sendable {
    /// The count of predictions in one answer.
    public static let count = 3
    /// The most characters of the field that go to the model.
    public static let maxTypedCharacters = 500
    /// The most Said lines that go to the model.
    public static let maxSaidLines = 10

    public let instructions: String
    public let prompt: String
    /// The end of the text before the caret, as the model sees it.
    public let typed: String
    /// The letters that each answer must start with: the partial word at the
    /// caret. The model does not keep to the partial word without a guide.
    public let answerPrefix: String

    public init(context: PredictionContext) {
        typed = Self.tail(of: context.typed)
        answerPrefix = context.partialWord
        let isCompletion = !typed.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let intro = Self.intro(context.mode)
        let screen = context.mode == .type ? context.screen : nil
        instructions =
            isCompletion
            ? Self.completion(intro, context.mode, screen: screen != nil)
            : Self.opening(intro, context.mode, screen: screen != nil)

        let history = context.said.suffix(Self.maxSaidLines).map { "Me: \($0)" }
        let background = "Conversation:\n" + history.joined(separator: "\n")
        let parts = [
            screen.map(Self.screenPart),
            isCompletion ? "Current input: \"\(typed)\"" : nil,
            background,
        ]
        prompt = parts.compactMap { $0 }.joined(separator: "\n\n")
    }

    private static func screenPart(_ screen: ScreenContext) -> String {
        var lines = ["Screen:"]
        if let app = screen.appName { lines.append("App: \(app)") }
        if let title = screen.title { lines.append("Title: \(title)") }
        if let field = screen.field { lines.append("Field: \(field)") }
        if !screen.lines.isEmpty {
            lines.append("Text near the field, oldest first:")
            lines += screen.lines.map { "- \($0)" }
        }
        return lines.joined(separator: "\n")
    }

    private static let screenContext =
        "- The \"Screen\" part is the app, the window, and the text near the field, such as the messages of a chat or the email that the User answers. It can hold the words of other people"

    /// The last characters of the text, from the start of a word.
    private static func tail(of text: String) -> String {
        guard text.count > maxTypedCharacters else { return text }
        let end = text.suffix(maxTypedCharacters)
        guard let space = end.firstIndex(where: \.isWhitespace) else { return String(end) }
        return String(end[end.index(after: space)...])
    }

    private static func intro(_ mode: PredictionMode) -> String {
        switch mode {
        case .talk: "The User is using a communication app to speak out loud"
        case .type: "The User is typing into an app on their Mac, such as a message, a note, or an email"
        }
    }

    private static func length(_ mode: PredictionMode) -> String {
        switch mode {
        case .talk: "Keep suggestions speakable and natural, 5-7 words each. This is spoken conversation, not written text."
        case .type: "Keep suggestions natural, 5-10 words each. This is written text."
        }
    }

    private static func opening(_ intro: String, _ mode: PredictionMode, screen: Bool) -> String {
        let otherSide =
            screen
            ? "\(screenContext). If the last message is from another person, the User often answers it"
            : "- The other side of the conversation is usually invisible, so DO NOT assume the User is answering a question. Assume they are driving the conversation forward and need help saying their NEXT thing"
        return """
        Generate \(count) possible NEXT things the User might WANT TO SAY.

        <context>
        - \(intro)
        - The "Me:" lines below are things the User has already said through the app
        \(otherSide)
        - Think of suggestions as "what would this person most plausibly want to say next to keep this conversation going?"
        </context>

        <rules>
        - Suggestions must be things the User (Me) would say next, never replies FROM the other person
        - Do NOT generate answers to a question the User just asked
        - Prefer natural continuations of the User's own thread: follow-up questions, additional things they might add, new related topics, closers, clarifications, or small talk that fits the moment
        - \(length(mode))
        - Offer variety across the \(count) suggestions (e.g. one question, one statement, one topic shift) so the User has real choices
        - Do NOT write a suggestion about needs, care, health, or thanks unless the history raises it. The User is a person with a life, not a list of requests.
        - STRICTLY maintain the same language as the conversation
        - Put the best suggestion first
        </rules>
        """
    }

    private static func completion(_ intro: String, _ mode: PredictionMode, screen: Bool) -> String {
        let screenLine = screen ? "\n\(screenContext). Use it to understand what the User writes about" : ""
        return """
        Continue the User's partial input into \(count) full sentences.

        <context>
        - \(intro)
        - The "current input" below is what they have typed so far. It may end with a partial word, phrase, or sentence
        - The "Me:" lines are the recent conversation history for context\(screenLine)
        </context>

        <rules>
        - Give only the words that come after the current input. Do NOT repeat the current input
        - If the input ends with a partial word, begin with that whole word
        - Continue the sentence naturally in the same language as the typed input
        - \(length(mode))
        - Make the \(count) completions different from each other
        - Do NOT complete into needs, care, health, or thanks unless the input or the history raises it
        - Put the best completion first
        </rules>
        """
    }
}
