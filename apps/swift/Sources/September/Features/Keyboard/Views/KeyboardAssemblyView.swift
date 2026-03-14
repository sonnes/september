import SwiftUI

/// Top-level keyboard view composing all 4 sections.
/// Shown inside FloatingPanel via NSHostingView.
struct KeyboardAssemblyView: View {
    let modifierState: ModifierState
    let accessibilityManager: AccessibilityManager

    @AppStorage("keyboardStyle") private var keyboardStyle: KeyboardStyle = .darkRainbow
    @State private var displayText = ""

    var body: some View {
        VStack(spacing: 0) {
            AccessibilityBanner(accessibilityManager: accessibilityManager)
                .padding(.bottom, 4)

            HStack(alignment: .top, spacing: 0) {
                LeftKeypadView(accessibilityManager: accessibilityManager)

                Divider()
                    .frame(height: nil)

                MainKeyboardView(
                    modifierState: modifierState,
                    accessibilityManager: accessibilityManager,
                    keyboardStyle: keyboardStyle,
                    displayText: $displayText
                )
                .padding(.horizontal, 8)

                Divider()
                    .frame(height: nil)

                RightKeypadView(accessibilityManager: accessibilityManager)

                Divider()
                    .frame(height: nil)

                AppShortcutsPlaceholder()
            }
        }
        .padding(8)
        .background(DesignColors.kbBackground)
    }
}
