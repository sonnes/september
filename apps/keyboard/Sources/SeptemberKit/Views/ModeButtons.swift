import SwiftUI

/// Type / Talk / Write / Settings, beside the input bar. A button selects its
/// mode. Only Type does anything yet.
public struct ModeButtons: View {
    @EnvironmentObject private var controller: KeyboardController

    public init() {}

    public var body: some View {
        HStack(spacing: Metrics.Mode.spacing) {
            ForEach(KeyboardController.Mode.allCases, id: \.self) { mode in
                ModeButton(mode: mode, isSelected: mode == controller.mode) {
                    controller.mode = mode
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Modes")
    }
}

private struct ModeButton: View {
    let mode: KeyboardController.Mode
    let isSelected: Bool
    let select: @MainActor () -> Void

    var body: some View {
        VStack(spacing: Metrics.Mode.titleGap) {
            Image(systemName: mode.symbol)
                .font(Typography.modeIcon)
                .foregroundStyle(Color(isSelected ? Tokens.accent : Tokens.labelSecondary))
                .frame(width: Metrics.Mode.button, height: Metrics.Mode.button)
                .background(Circle().fill(Color(Tokens.key)))
                .overlay(
                    Circle().strokeBorder(
                        Color(isSelected ? Tokens.accent : Tokens.strokeStandard),
                        lineWidth: isSelected ? Metrics.Mode.selectedStroke : Metrics.Mode.stroke
                    )
                )
                .pressable(label: mode.title, isSelected: isSelected) { _ in } action: { select() }

            Text(mode.title)
                .font(Typography.modeTitle)
                .foregroundStyle(Color(isSelected ? Tokens.accent : Tokens.sectionLabel))
                // Without this the title is squeezed to nothing when the
                // row's height is set by the input bar beside it.
                .fixedSize()
                // The button already speaks the title.
                .accessibilityHidden(true)
        }
    }
}
