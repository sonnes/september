import SwiftUI

/// The Predictions page of the Settings window. It uses the standard macOS
/// controls.
public struct PredictionsSettingsPage: View {
    @ObservedObject private var engine: PredictionEngine
    @ObservedObject private var history: SentenceHistory
    @ObservedObject private var inputMonitoring: InputMonitoringStatus
    private let onOpenSystemSettings: () -> Void
    @State private var confirmsClear = false

    public init(
        engine: PredictionEngine,
        history: SentenceHistory,
        inputMonitoring: InputMonitoringStatus = InputMonitoringStatus(),
        onOpenSystemSettings: @escaping () -> Void = PredictionNoticeView.openSystemSettings
    ) {
        self.engine = engine
        self.history = history
        self.inputMonitoring = inputMonitoring
        self.onOpenSystemSettings = onOpenSystemSettings
    }

    public var body: some View {
        Form {
            Section {
                Toggle("Sentence predictions", isOn: $engine.sentencesEnabled)
                LabeledContent("Apple Intelligence", value: engine.availability.status)
                if engine.availability == .off {
                    Button("Open System Settings", action: onOpenSystemSettings)
                }
            } footer: {
                Text("Three predictions show above the input bar. Apple Intelligence makes them on this Mac.")
            }
            Section {
                Toggle("Learn from the sentences that I send", isOn: $history.isEnabled)
                HStack {
                    Text(sentenceCount)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("Clear Sentence History…") { confirmsClear = true }
                        .disabled(history.count == 0)
                }
                .confirmationDialog("Clear the sentence history?", isPresented: $confirmsClear) {
                    Button("Clear Sentence History", role: .destructive, action: history.clear)
                } message: {
                    Text("The predictions lose every sentence that you sent. You cannot undo this.")
                }
            } footer: {
                Text(
                    "When you press Return on the keys, or Speak in Talk mode, the keyboard keeps each sentence. While you type, the sentences that continue your words show first. The history stays on this Mac. It keeps nothing from a password field, from private text, or from Write. When you turn the history off, it removes every sentence."
                )
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            Section {
                Toggle("Use the text on screen", isOn: $engine.screenEnabled)
            } footer: {
                Text(
                    "In Type mode, the sentence predictions read the text near the field, such as the messages of a chat. The text stays on this Mac. The keyboard never reads a password field or private text."
                )
            }
            Section {
                Toggle("Word completions", isOn: $engine.wordsEnabled)
            } footer: {
                Text("Completions for the word at the caret show above the keys. They come from the word suggestions of macOS.")
            }
            Section {
                LabeledContent("Input Monitoring", value: inputMonitoring.isAllowed ? "On" : "Off")
                if !inputMonitoring.isAllowed {
                    Button("Open Input Monitoring Settings") { inputMonitoring.openSettings() }
                }
            } header: {
                Text("Shortcuts")
            } footer: {
                Text(
                    "When you hold Command or Control on the hardware keyboard, the shortcuts of the app show in the place of the input bar. This needs Input Monitoring. After you allow it, quit September Keyboard and open it again."
                )
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .formStyle(.grouped)
        .onAppear { engine.refreshAvailability() }
    }

    private var sentenceCount: String {
        switch history.count {
        case 0: "No sentences"
        case 1: "1 sentence"
        case let count: "\(count) sentences"
        }
    }
}
