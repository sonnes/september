import SwiftUI

/// Central keyboard section: InputBar + all key rows.
/// 980pt wide, contains function row through modifier row.
struct MainKeyboardView: View {
    let modifierState: ModifierState
    let accessibilityManager: AccessibilityManager
    let keyboardStyle: KeyboardStyle
    @Binding var displayText: String

    var body: some View {
        VStack(spacing: 4) {
            InputBar(displayText: $displayText)
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
            // No modifiers — send with shift state from caps/shift
            EventInjector.shared.send(keyCode: key.keyCode, shift: modifierState.effectiveShift)
        } else {
            // Has modifiers — send with combined flags
            var combinedFlags = flags
            if modifierState.effectiveShift {
                combinedFlags.insert(.maskShift)
            }
            EventInjector.shared.send(keyCode: key.keyCode, modifiers: combinedFlags)
        }

        // Update display text for visual feedback
        updateDisplayText(key)

        // Reset non-locked modifiers
        modifierState.resetAfterKeyPress()
    }

    private func updateDisplayText(_ key: KeyDefinition) {
        switch key.keyCode {
        case KeyCodes.delete:
            if !displayText.isEmpty { displayText.removeLast() }
        case KeyCodes.space:
            displayText.append(" ")
        case KeyCodes.returnKey:
            displayText.append("\n")
        case KeyCodes.tab:
            displayText.append("\t")
        default:
            // Only append characters for standard and dual keys (not special/function)
            guard key.keyType == .standard || key.keyType == .dual else { break }
            if !key.label.isEmpty {
                let char = modifierState.effectiveShift
                    ? (key.shiftLabel ?? key.label.uppercased())
                    : key.label
                displayText.append(char)
            }
        }
    }
}
