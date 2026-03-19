import SwiftUI

/// Central keyboard section: InputBar + key rows.
/// 980pt wide, contains function row through modifier row.
///
/// Predictions and word suggestions are in a separate floating panel above.
/// displayText is updated by AX polling in KeyboardAssemblyView.
struct MainKeyboardView: View {
    let modifierState: ModifierState
    let accessibilityManager: AccessibilityManager
    let keyboardStyle: KeyboardStyle
    var isSpeaking: Bool = false
    var onSpeakTapped: () -> Void = {}
    var onSettingsTapped: () -> Void = {}
    @Binding var displayText: String

    var body: some View {
        VStack(spacing: 4) {
            InputBar(
                displayText: $displayText,
                isSpeaking: isSpeaking,
                onSpeakTapped: onSpeakTapped,
                onSettingsTapped: onSettingsTapped
            )
            .padding(.bottom, 8)

            ForEach(Array(KeyboardLayout.allRows.enumerated()), id: \.offset) { rowIndex, row in
                HStack(spacing: 4) {
                    ForEach(row) { key in
                        KeyView(
                            key: key,
                            modifierState: modifierState,
                            rowAccentColor: keyboardStyle.accentColor(forRow: rowIndex),
                            onPress: { handleKeyPress(key) }
                        )
                    }
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Main keyboard")
    }

    private func handleKeyPress(_ key: KeyDefinition) {
        if key.isModifier {
            modifierState.toggle(key.keyCode)
            return
        }

        guard accessibilityManager.isGranted else { return }

        let flags = modifierState.modifierFlags()

        if flags.isEmpty {
            EventInjector.shared.send(keyCode: key.keyCode, shift: modifierState.effectiveShift)
        } else {
            var combinedFlags = flags
            if modifierState.effectiveShift {
                combinedFlags.insert(.maskShift)
            }
            EventInjector.shared.send(keyCode: key.keyCode, modifiers: combinedFlags)
        }

        modifierState.resetAfterKeyPress()
    }
}
