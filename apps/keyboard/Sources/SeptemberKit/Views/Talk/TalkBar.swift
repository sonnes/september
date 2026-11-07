import SwiftUI

/// The input bar in Talk mode. The text is in the keyboard, so the bar has
/// an accent border and a Talk chip.
///
/// During speech, `speakingWord` is the range of the current word, in UTF-16
/// units. The words before it are spoken, and the words after it are gray.
public struct TalkBar: View {
    @ObservedObject private var talk: TalkSession
    private let speakingWord: NSRange?
    private let width: CGFloat

    public init(talk: TalkSession, speakingWord: NSRange? = nil, width: CGFloat = Metrics.keyboardWidth) {
        self.talk = talk
        self.speakingWord = speakingWord
        self.width = width
    }

    public var body: some View {
        HStack(spacing: Metrics.Input.spacing) {
            Image(systemName: "bubble.left")
                .font(Typography.inputIcon)
                .foregroundStyle(Color(Tokens.labelSecondary))

            content

            if !talk.text.isEmpty {
                Button {
                    talk.clear()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(Typography.inputIcon)
                        .foregroundStyle(Color(Tokens.dualSecondary))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear the talk text")
            }

            Text("Talk")
                .font(Typography.talkChip)
                .foregroundStyle(Color(Tokens.labelSecondary))
                .padding(.vertical, Metrics.Talk.chipVerticalPadding)
                .padding(.horizontal, Metrics.Talk.chipHorizontalPadding)
                .overlay(
                    RoundedRectangle(cornerRadius: Metrics.Talk.chipCornerRadius, style: .continuous)
                        .strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1)
                )
                .accessibilityHidden(true)
        }
        .padding(.horizontal, Metrics.Input.horizontalPadding)
        .frame(width: width, height: Metrics.Input.height)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Input.cornerRadius, style: .continuous)
                .fill(Color(Tokens.key))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.Input.cornerRadius, style: .continuous)
                .strokeBorder(Color(Tokens.accent), lineWidth: Metrics.Talk.barBorder)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Talk text")
        .accessibilityValue(talk.text.isEmpty ? "empty" : talk.text)
    }

    @ViewBuilder
    private var content: some View {
        if talk.text.isEmpty {
            Text("Type what you want to say")
                .font(Typography.inputPlaceholder)
                .foregroundStyle(Color(Tokens.labelSecondary))
            Spacer(minLength: 0)
        } else if let speakingWord {
            let parts = InputMirror.split(
                talk.text, caret: speakingWord.location, selectionLength: speakingWord.length)
            HStack(spacing: 0) {
                run(parts.before, color: Tokens.keyText)
                    .truncationMode(.head)
                    .layoutPriority(1)
                run(parts.selected, color: Tokens.keyText)
                    .background(
                        RoundedRectangle(cornerRadius: Metrics.Talk.wordHighlightCornerRadius)
                            .fill(Color(Tokens.selection))
                    )
                    .layoutPriority(2)
                run(parts.after, color: Tokens.labelSecondary)
                    .truncationMode(.tail)
                Spacer(minLength: 0)
            }
        } else {
            HStack(spacing: Metrics.Input.caretGap) {
                run(talk.text, color: Tokens.keyText)
                    .truncationMode(.head)
                TalkCaret()
                Spacer(minLength: 0)
            }
        }
    }

    private func run(_ text: String, color: ThemeColor) -> some View {
        Text(text)
            .font(Typography.inputText)
            .foregroundStyle(Color(color))
            .lineLimit(1)
    }
}

/// The caret of the Talk bar, in the accent color. It holds still when the
/// user asks for reduced motion.
private struct TalkCaret: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var visible = true

    var body: some View {
        Rectangle()
            .fill(Color(Tokens.accent))
            .frame(width: Metrics.Input.caret.width, height: Metrics.Input.caret.height)
            .opacity(visible ? 1 : 0)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: Metrics.Input.caretBlink).repeatForever()) {
                    visible = false
                }
            }
            .accessibilityHidden(true)
    }
}
