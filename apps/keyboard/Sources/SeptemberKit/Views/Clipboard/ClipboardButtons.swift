import SwiftUI

/// Cut, Copy, Paste, and History, at the left of the input bar.
///
/// Cut, Copy, and Paste act when the button goes down, as the shortcut
/// buttons do. History opens a view, so it acts when the button goes up.
public struct ClipboardButtons: View {
    @ObservedObject private var session: KeyboardSession

    public init(session: KeyboardSession) {
        self.session = session
    }

    public var body: some View {
        HStack(spacing: Metrics.TopRow.modeSpacing) {
            ModeButton(
                title: "Cut", symbol: "scissors", isOn: false, label: "Cut",
                isEnabled: session.canCutOrCopy, trigger: .down(.once), action: session.cut)
            ModeButton(
                title: "Copy", symbol: "doc.on.doc", isOn: false, label: "Copy",
                isEnabled: session.canCutOrCopy, trigger: .down(.once), action: session.copy)
            ModeButton(
                title: "Paste", symbol: "doc.on.clipboard", isOn: false, label: "Paste",
                isEnabled: session.canPaste, trigger: .down(.once), action: session.paste)
            ModeButton(
                title: "History", symbol: "clock.arrow.circlepath", isOn: session.isHistoryOpen,
                label: "Clipboard history", action: session.toggleHistory)
        }
        .frame(width: Metrics.Clipboard.buttonsWidth)
        .accessibilityElement(children: .contain)
    }
}
