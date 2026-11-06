import SwiftUI

/// A line of text during speech. The words that the voice spoke are in the
/// text color, the current word has a highlight, and the words that come
/// later are gray.
public struct SpokenText: View {
    private let text: String
    private let word: NSRange?

    /// `word` is the UTF-16 range of the current word in `text`, as `Speaker` publishes it.
    public init(_ text: String, word: NSRange?) {
        self.text = text
        self.word = word
    }

    /// The text before the current word, the word, and the text after it.
    /// Before the first word, or for a range outside the text, all of the
    /// text comes later.
    public static func parts(of text: String, word: NSRange?) -> (spoken: String, now: String, later: String) {
        guard let word, let range = Range(word, in: text) else { return ("", "", text) }
        return (String(text[..<range.lowerBound]), String(text[range]), String(text[range.upperBound...]))
    }

    public var body: some View {
        let parts = Self.parts(of: text, word: word)
        HStack(spacing: 0) {
            Text(parts.spoken)
                .foregroundStyle(Color(Tokens.keyText))
                .truncationMode(.head)
            if !parts.now.isEmpty {
                Text(parts.now)
                    .foregroundStyle(Color(Tokens.keyText))
                    .padding(.horizontal, Metrics.Speak.wordHorizontalPadding)
                    .padding(.vertical, Metrics.Speak.wordVerticalPadding)
                    .background(
                        RoundedRectangle(cornerRadius: Metrics.Speak.wordCornerRadius, style: .continuous)
                            .fill(Color(Tokens.selection))
                    )
                    .layoutPriority(1)
            }
            Text(parts.later)
                .foregroundStyle(Color(Tokens.labelSecondary))
                .truncationMode(.tail)
        }
        .font(Typography.inputText)
        .lineLimit(1)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(text)
    }
}
