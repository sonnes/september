import SwiftUI

struct KeyboardView: View {
    @State private var isShiftActive = false
    @State private var isCapsLockOn = false

    private var shiftState: Bool { isShiftActive || isCapsLockOn }

    var body: some View {
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
        .background(Color(nsColor: NSColor(white: 0.92, alpha: 0.98)))
    }

    private func handleKeyPress(_ key: KeyDefinition) {
        switch key.keyCode {
        case KeyCodes.shift, KeyCodes.rightShift:
            isShiftActive.toggle()
        case KeyCodes.capsLock:
            isCapsLockOn.toggle()
        default:
            EventInjector.shared.send(keyCode: key.keyCode, shift: shiftState)
            // Auto-release shift after typing a character (not for caps lock)
            if isShiftActive && !key.isModifier {
                isShiftActive = false
            }
        }
    }
}
