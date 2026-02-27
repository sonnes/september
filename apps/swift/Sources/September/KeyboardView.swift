import SwiftUI

struct KeyboardView: View {
    @State private var isShiftActive = false
    @State private var isCapsLockOn = false
    @State private var typingTracker = TypingTracker()
    @AppStorage("dwellEnabled") private var dwellEnabled = true

    private var shiftState: Bool { isShiftActive || isCapsLockOn }

    var body: some View {
        VStack(spacing: 0) {
            SuggestionsBarView(tracker: typingTracker)

            Divider()
                .background(Color.gray.opacity(0.3))

            HStack(alignment: .top, spacing: 0) {
                ShortcutPanelView(sections: ShortcutLayout.leftSections)

                Divider()
                    .background(Color.gray.opacity(0.3))

                VStack(spacing: 4) {
                    ForEach(Array(KeyboardLayout.allRows.enumerated()), id: \.offset) { _, row in
                        HStack(spacing: 4) {
                            ForEach(row) { key in
                                KeyButton(key: key, isShiftActive: shiftState) {
                                    handleKeyPress(key)
                                }
                            }
                        }
                    }
                }
                .padding(8)

                Divider()
                    .background(Color.gray.opacity(0.3))

                rightPanel
            }
        }
        .background(Color(nsColor: NSColor(white: 0.92, alpha: 0.98)))
    }

    private var rightPanel: some View {
        VStack(alignment: .center, spacing: 8) {
            ShortcutPanelView(sections: ShortcutLayout.rightSections)

            // Arrow keys cluster
            VStack(spacing: 3) {
                Text("Arrows")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)

                HStack(spacing: 3) {
                    Spacer()
                    arrowKey("↑", code: KeyCodes.upArrow)
                    Spacer()
                }
                HStack(spacing: 3) {
                    arrowKey("←", code: KeyCodes.leftArrow)
                    arrowKey("↓", code: KeyCodes.downArrow)
                    arrowKey("→", code: KeyCodes.rightArrow)
                }
            }
            .padding(.horizontal, 6)

            Button {
                dwellEnabled.toggle()
            } label: {
                Text(dwellEnabled ? "Dwell On" : "Dwell Off")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(dwellEnabled ? .primary : .secondary)
                    .frame(width: 78, height: 24)
                    .background(dwellEnabled ? Color.accentColor.opacity(0.2) : Color.gray.opacity(0.15))
                    .cornerRadius(5)
            }
            .buttonStyle(.plain)
            .help(dwellEnabled ? "Disable dwell" : "Enable dwell")
            .padding(.horizontal, 6)

            Spacer()
        }
    }

    private func arrowKey(_ label: String, code: UInt16) -> some View {
        ShortcutButton(
            shortcut: ShortcutDefinition(label, tooltip: label, code: code)
        ) {
            EventInjector.shared.send(keyCode: code, shift: shiftState)
            if isShiftActive {
                isShiftActive = false
            }
        }
    }

    private func handleKeyPress(_ key: KeyDefinition) {
        switch key.keyCode {
        case KeyCodes.shift, KeyCodes.rightShift:
            isShiftActive.toggle()
        case KeyCodes.capsLock:
            isCapsLockOn.toggle()
        default:
            EventInjector.shared.send(keyCode: key.keyCode, shift: shiftState)
            typingTracker.trackKey(keyCode: key.keyCode, shift: shiftState)
            if isShiftActive && !key.isModifier {
                isShiftActive = false
            }
        }
    }
}
