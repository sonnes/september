import SwiftUI

/// Routes a KeyDefinition to the correct visual representation using KeyBase
/// with the appropriate KeyAppearance and label layout.
///
/// Routing:
///   .standard  → single centered label (18pt)
///   .special   → single centered label (12pt)
///   .function  → single centered label (11pt medium)
///   .dual      → VStack: top shift label (11pt) + bottom primary label (16pt)
struct KeyView: View {
    let key: KeyDefinition
    let modifierState: ModifierState
    let rowAccentColor: Color?
    let onPress: () -> Void

    var body: some View {
        let appearance = KeyAppearance.forKey(key)

        KeyBase(
            appearance: appearance,
            accessibilityText: accessibilityLabel,
            onPress: onPress
        ) {
            switch key.keyType {
            case .dual:
                dualLabel(appearance: appearance)
            default:
                singleLabel(appearance: appearance)
            }
        }
    }

    // MARK: - Label Layouts

    private func singleLabel(appearance: KeyAppearance) -> some View {
        let displayLabel: String
        if key.keyType == .standard && !key.isModifier {
            displayLabel = modifierState.effectiveShift ? key.label.uppercased() : key.label
        } else {
            displayLabel = key.label
        }

        let labelColor = rowAccentColor ?? appearance.labelColor

        return Text(displayLabel)
            .font(appearance.labelFont)
            .foregroundStyle(labelColor)
    }

    private func dualLabel(appearance: KeyAppearance) -> some View {
        VStack(spacing: 2) {
            Text(key.shiftLabel ?? "")
                .font(.system(size: 11))
                .foregroundStyle(rowAccentColor?.opacity(0.7) ?? DesignColors.keyDualTopLabel)
            Text(key.label)
                .font(.system(size: 16))
                .foregroundStyle(rowAccentColor ?? DesignColors.keyDualBottomLabel)
        }
    }

    // MARK: - Accessibility

    private var accessibilityLabel: String {
        if key.isModifier {
            let name = modifierName(key.label)
            let state = isModifierActive ? "active" : ""
            return [name, state].filter { !$0.isEmpty }.joined(separator: ", ")
        }
        if key.isDualLabel, let shift = key.shiftLabel {
            return "\(key.label), shift \(shift)"
        }
        return key.label
    }

    private var isModifierActive: Bool {
        switch key.keyCode {
        case KeyCodes.shift, KeyCodes.rightShift: return modifierState.isShiftActive
        case KeyCodes.capsLock: return modifierState.isCapsLockOn
        case KeyCodes.command, KeyCodes.rightCommand: return modifierState.isCommandActive
        case KeyCodes.control, KeyCodes.rightControl: return modifierState.isControlActive
        case KeyCodes.option, KeyCodes.rightOption: return modifierState.isOptionActive
        default: return false
        }
    }

    private func modifierName(_ symbol: String) -> String {
        switch symbol {
        case "⇧": return "Shift"
        case "⇪": return "Caps Lock"
        case "⌘": return "Command"
        case "⌃": return "Control"
        case "⌥": return "Option"
        case "fn": return "Function"
        case "⇥": return "Tab"
        case "⌫": return "Delete"
        case "⏎": return "Return"
        case "⌦": return "Forward Delete"
        default: return symbol
        }
    }
}
