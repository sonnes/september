import SwiftData
import SwiftUI

/// Top-level keyboard view composing all 4 sections.
/// Shown inside FloatingPanel via NSHostingView.
///
/// Polls the focused app's text field via AXTextService every 200ms
/// so displayText always mirrors reality. Predictions and word suggestions
/// are displayed in a separate transparent floating panel above the keyboard.
struct KeyboardAssemblyView: View {
    let modifierState: ModifierState
    let accessibilityManager: AccessibilityManager
    let predictionEngine: PredictionEngine
    let axTextService: AXTextService
    var onSettingsTapped: () -> Void = {}

    @AppStorage("keyboardStyle") private var keyboardStyle: KeyboardStyle = .darkRainbow
    @State private var displayText = ""
    @State private var pollingTask: Task<Void, Never>?
    @Query private var accounts: [Account]

    private var account: Account? { accounts.first }

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
                    onSettingsTapped: onSettingsTapped,
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
        .onAppear {
            configureEngine()
            startPolling()
        }
        .onDisappear {
            pollingTask?.cancel()
        }
        .onChange(of: account?.aiSuggestions) { _, _ in
            configureEngine()
        }
    }

    // MARK: - AX Text Polling

    private func startPolling() {
        pollingTask?.cancel()
        pollingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(200))
                guard !Task.isCancelled else { break }

                if let axText = axTextService.readText() {
                    if axText != displayText {
                        displayText = axText
                        predictionEngine.textDidChange(axText)
                    }
                }
            }
        }
    }

    // MARK: - Engine Configuration

    private func configureEngine() {
        guard let account else { return }
        let config = account.aiSuggestions
        guard config.enabled else { return }
        predictionEngine.configure(
            provider: config.provider,
            apiKey: account.apiKey(for: config.provider),
            model: config.model,
            temperature: config.temperature
        )
    }
}
