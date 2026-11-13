import SwiftUI

/// Type, Talk, Write, and Settings, at the right of Speak. Type and Talk are
/// the modes. Write opens the Write window, and Settings opens the Settings
/// window.
public struct ModeButtons: View {
    private let mode: KeyboardMode
    private let setMode: (KeyboardMode) -> Void
    private let write: () -> Void
    private let arrange: () -> Void
    private let settings: () -> Void

    public init(
        mode: KeyboardMode,
        setMode: @escaping (KeyboardMode) -> Void,
        write: @escaping () -> Void,
        arrange: @escaping () -> Void,
        settings: @escaping () -> Void
    ) {
        self.mode = mode
        self.setMode = setMode
        self.write = write
        self.arrange = arrange
        self.settings = settings
    }

    public var body: some View {
        HStack(alignment: .barCenter, spacing: Metrics.TopRow.modeSpacing) {
            ModeButton(title: "Type", symbol: "keyboard", isOn: mode == .type, label: "Type mode") {
                setMode(.type)
            }
            ModeButton(title: "Talk", symbol: "bubble.left", isOn: mode == .talk, label: "Talk mode") {
                setMode(.talk)
            }
            ModeButton(title: "Write", symbol: "pencil", isOn: false, label: "Open Write", action: write)
            if DetachedPanel.isShown(in: mode) {
                ModeButton(
                    title: "Arrange", symbol: "rectangle.3.group", isOn: false,
                    label: "Arrange the panels around the keyboard", action: arrange)
            }
            ModeButton(title: "Settings", symbol: "gearshape", isOn: false, label: "Open Settings", action: settings)
                .padding(.leading, Metrics.TopRow.settingsGap)
        }
    }
}
