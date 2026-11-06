import SwiftUI

/// Shows the text the app in front has focused, read back over accessibility,
/// with its caret and selection. Apps that expose no text (Terminal, canvases)
/// fall back to an echo of what Keyboard itself typed.
///
/// Either way it is a mirror, not a text field: keystrokes go straight to the
/// app in front, and the panel never takes focus, so there is nothing here to
/// edit.
public struct InputBar: View {
    @EnvironmentObject private var controller: KeyboardController

    public init() {}

    public var body: some View {
        HStack(spacing: Metrics.Input.spacing) {
            Image(systemName: leadingSymbol)
                .font(Typography.inputIcon)
                .foregroundStyle(Color(Tokens.labelSecondary))

            switch controller.input {
            case .secure:
                Text(
                    controller.isFieldPrivate
                        ? "Private text in this field. The keyboard does not show it."
                        : "Password field — hidden")
                    .font(Typography.inputPlaceholder)
                    .foregroundStyle(Color(Tokens.dualSecondary))
                Spacer(minLength: 0)
            case .local(let text):
                HStack(spacing: Metrics.Input.caretGap) {
                    Line(text)
                        .truncationMode(.head)
                    Caret()
                    Spacer(minLength: 0)
                }
            case .mirrored(let text, let caret, let selectionLength):
                let parts = InputMirror.split(text, caret: caret, selectionLength: selectionLength)
                HStack(spacing: 0) {
                    Line(parts.before)
                        .truncationMode(.head)
                        .layoutPriority(1)
                    if parts.selected.isEmpty {
                        Caret()
                    } else {
                        Line(parts.selected)
                            .background(Color(Tokens.selection))
                            .layoutPriority(1)
                    }
                    Line(parts.after)
                        .truncationMode(.tail)
                    Spacer(minLength: 0)
                }
            }

            if case .local(let text) = controller.input, !text.isEmpty {
                Button {
                    controller.clearEcho()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(Typography.inputIcon)
                        .foregroundStyle(Color(Tokens.dualSecondary))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear typed text")
            }
        }
        .padding(.horizontal, Metrics.Input.horizontalPadding)
        .frame(width: Metrics.keyboardWidth, height: Metrics.Input.height)
        .background(
            RoundedRectangle(cornerRadius: Metrics.Input.cornerRadius, style: .continuous)
                .fill(Color(Tokens.key))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.Input.cornerRadius, style: .continuous)
                .strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityValue(controller.input.isEmpty ? "empty" : controller.input.text)
    }

    private var leadingSymbol: String {
        switch controller.input {
        case .secure: "lock.fill"
        case .mirrored: "text.cursor"
        case .local: "magnifyingglass"
        }
    }

    private var accessibilityLabel: String {
        switch controller.input {
        case .secure: controller.isFieldPrivate ? "Private text" : "Password field"
        case .mirrored: controller.frontmostAppName.map { "Text in \($0)" } ?? "Text in the app in front"
        case .local: "Typed text"
        }
    }
}

/// One run of the mirrored line — same type on every side of the caret.
private struct Line: View {
    private let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text)
            .font(Typography.inputText)
            .foregroundStyle(Color(Tokens.keyText))
            .lineLimit(1)
    }
}

/// A blinking caret, held still when the user has asked for reduced motion.
private struct Caret: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var visible = true

    var body: some View {
        Rectangle()
            .fill(Color(Tokens.keyText))
            .frame(width: Metrics.Input.caret.width, height: Metrics.Input.caret.height)
            .opacity(visible ? 1 : 0)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: Metrics.Input.caretBlink).repeatForever()) { visible = false }
            }
            .accessibilityHidden(true)
    }
}
