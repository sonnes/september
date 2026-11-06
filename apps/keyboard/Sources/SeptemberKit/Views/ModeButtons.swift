import SwiftUI

/// Type, Talk, Write, and Settings, at the right of Speak. Type and Talk are
/// the modes. Write opens the Write window, and Settings opens the Settings
/// window.
public struct ModeButtons: View {
    private let mode: KeyboardMode
    private let setMode: (KeyboardMode) -> Void
    private let write: () -> Void
    private let settings: () -> Void

    public init(
        mode: KeyboardMode,
        setMode: @escaping (KeyboardMode) -> Void,
        write: @escaping () -> Void,
        settings: @escaping () -> Void
    ) {
        self.mode = mode
        self.setMode = setMode
        self.write = write
        self.settings = settings
    }

    public var body: some View {
        HStack(spacing: Metrics.TopRow.modeSpacing) {
            ModeButton(title: "Type", symbol: "keyboard", isOn: mode == .type, label: "Type mode") {
                setMode(.type)
            }
            ModeButton(title: "Talk", symbol: "bubble.left", isOn: mode == .talk, label: "Talk mode") {
                setMode(.talk)
            }
            ModeButton(title: "Write", symbol: "pencil", isOn: false, label: "Open Write", action: write)
            ModeButton(title: "Settings", symbol: "gearshape", isOn: false, label: "Open Settings", action: settings)
                .padding(.leading, Metrics.TopRow.settingsGap)
        }
    }
}

private struct ModeButton: View {
    let title: String
    let symbol: String
    let isOn: Bool
    let label: String
    let action: () -> Void

    @State private var isPressed = false

    var body: some View {
        VStack(spacing: Metrics.TopRow.modeLabelSpacing) {
            Image(systemName: symbol)
                .font(Typography.modeIcon)
                .foregroundStyle(Color(isOn ? Tokens.accent : Tokens.labelSecondary))
                .frame(width: Metrics.TopRow.modeCircle, height: Metrics.TopRow.modeCircle)
                .background(Circle().fill(Color(isPressed ? Tokens.keyActive : Tokens.key)))
                .overlay(
                    Circle().strokeBorder(
                        Color(isOn ? Tokens.accent : Tokens.strokeStandard),
                        lineWidth: isOn ? Metrics.TopRow.modeBorderOn : Metrics.TopRow.modeBorder)
                )
            Text(title)
                .font(Typography.modeLabel)
                .foregroundStyle(Color(isOn ? Tokens.accent : Tokens.sectionLabel))
        }
        .pressable(label: label, isSelected: isOn, onPressing: { isPressed = $0 }, action: action)
    }
}
