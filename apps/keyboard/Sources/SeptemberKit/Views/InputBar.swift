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

    private let width: CGFloat

    public init(width: CGFloat = Metrics.keyboardWidth) {
        self.width = width
    }

    public var body: some View {
        HStack(spacing: 12) {
            Image(systemName: leadingSymbol)
                .font(.system(size: 15))
                .foregroundStyle(Color(Tokens.labelSecondary))

            switch controller.input {
            case .secure:
                Text("Password field — hidden")
                    .font(.system(size: 14))
                    .foregroundStyle(Color(Tokens.dualSecondary))
                Spacer(minLength: 0)
            case .local(let text):
                HStack(spacing: 2) {
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
                        .font(.system(size: 15))
                        .foregroundStyle(Color(Tokens.dualSecondary))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clear typed text")
            }
        }
        .padding(.horizontal, 18)
        .frame(width: width, height: Metrics.inputBarHeight)
        .background(
            RoundedRectangle(cornerRadius: Metrics.inputBarCornerRadius, style: .continuous)
                .fill(Color(Tokens.key))
        )
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.inputBarCornerRadius, style: .continuous)
                .strokeBorder(Color(Tokens.strokeStandard), lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityValue(controller.input.isEmpty ? "empty" : controller.input.text)
    }

    /// A lock for a password field, the app's own text otherwise.
    private var leadingSymbol: String {
        switch controller.input {
        case .secure: "lock.fill"
        case .mirrored: "text.cursor"
        case .local: "magnifyingglass"
        }
    }

    private var accessibilityLabel: String {
        switch controller.input {
        case .secure: "Password field"
        case .mirrored: "Text in \(controller.frontmostAppName)"
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
            .font(.system(size: 16))
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
            .frame(width: 1.5, height: 20)
            .opacity(visible ? 1 : 0)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 0.6).repeatForever()) { visible = false }
            }
            .accessibilityHidden(true)
    }
}

/// Type / Talk / Write / Settings. Only Type does anything in this phase.
public struct ModeButtons: View {
    @EnvironmentObject private var controller: KeyboardController

    public init() {}

    public var body: some View {
        HStack(spacing: 12) {
            ForEach(KeyboardController.Mode.allCases, id: \.self) { mode in
                VStack(spacing: 5) {
                    Button {
                        controller.mode = mode
                    } label: {
                        Image(systemName: mode.symbol)
                            .font(.system(size: 16))
                            .foregroundStyle(
                                Color(mode == controller.mode ? Tokens.accent : Tokens.labelSecondary)
                            )
                            .frame(width: 44, height: 44)
                            .background(Circle().fill(Color(Tokens.key)))
                            .overlay(
                                Circle().strokeBorder(
                                    Color(mode == controller.mode ? Tokens.accent : Tokens.strokeStandard),
                                    lineWidth: mode == controller.mode ? 2 : 1
                                )
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(mode.title)
                    .accessibilityAddTraits(mode == controller.mode ? [.isButton, .isSelected] : .isButton)

                    Text(mode.title)
                        .font(.system(size: 9))
                        .foregroundStyle(
                            Color(mode == controller.mode ? Tokens.accent : Tokens.sectionLabel)
                        )
                        // Without this the label is squeezed to nothing when the
                        // row's height is set by the input bar beside it.
                        .fixedSize()
                }
            }
        }
    }
}
