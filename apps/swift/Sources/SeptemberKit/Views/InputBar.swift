import SwiftUI

/// Shows what has been typed since the last Return. It is an echo, not a text
/// field: keystrokes go straight to the app in front, and the panel never takes
/// focus, so there is nothing here to edit.
public struct InputBar: View {
    @EnvironmentObject private var controller: KeyboardController

    private let width: CGFloat

    public init(width: CGFloat = Metrics.keyboardWidth) {
        self.width = width
    }

    public var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 15))
                .foregroundStyle(Color(Tokens.labelSecondary))

            HStack(spacing: 2) {
                Text(controller.echo)
                    .font(.system(size: 16))
                    .foregroundStyle(Color(Tokens.keyText))
                    .lineLimit(1)
                    .truncationMode(.head)
                Caret()
                Spacer(minLength: 0)
            }

            if !controller.echo.isEmpty {
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
        .accessibilityLabel("Typed text")
        .accessibilityValue(controller.echo.isEmpty ? "empty" : controller.echo)
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
