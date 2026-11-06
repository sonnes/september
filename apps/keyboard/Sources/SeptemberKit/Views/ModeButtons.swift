import SwiftUI

/// Type / Talk / Write / Settings. Only Type does anything yet.
public struct ModeButtons: View {
    enum Mode: String, CaseIterable {
        case type, talk, write, settings

        var symbol: String {
            switch self {
            case .type: "keyboard"
            case .talk: "speaker.wave.2"
            case .write: "square.and.pencil"
            case .settings: "gearshape"
            }
        }

        var title: String { rawValue.capitalized }
    }

    @State private var selected: Mode = .type

    public init() {}

    public var body: some View {
        HStack(spacing: Metrics.Mode.spacing) {
            ForEach(Mode.allCases, id: \.self) { mode in
                VStack(spacing: Metrics.Mode.labelSpacing) {
                    Button {
                        selected = mode
                    } label: {
                        Image(systemName: mode.symbol)
                            .font(Typography.modeIcon)
                            .foregroundStyle(
                                Color(mode == selected ? Tokens.accent : Tokens.labelSecondary)
                            )
                            .frame(width: Metrics.Mode.buttonSize, height: Metrics.Mode.buttonSize)
                            .background(Circle().fill(Color(Tokens.key)))
                            .overlay(
                                Circle().strokeBorder(
                                    Color(mode == selected ? Tokens.accent : Tokens.strokeStandard),
                                    lineWidth: mode == selected ? Metrics.Mode.selectedStroke : 1
                                )
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(mode.title)
                    .accessibilityAddTraits(mode == selected ? [.isButton, .isSelected] : .isButton)

                    Text(mode.title)
                        .font(Typography.modeLabel)
                        .foregroundStyle(
                            Color(mode == selected ? Tokens.accent : Tokens.sectionLabel)
                        )
                        // Without this the label is squeezed to nothing when the
                        // row's height is set by the input bar beside it.
                        .fixedSize()
                }
            }
        }
    }
}
