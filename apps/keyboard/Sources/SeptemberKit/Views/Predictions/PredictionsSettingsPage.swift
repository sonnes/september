import SwiftUI

/// The Predictions page of the Settings window. It uses the standard macOS
/// controls.
public struct PredictionsSettingsPage: View {
    @ObservedObject private var engine: PredictionEngine
    private let onOpenSystemSettings: () -> Void

    public init(
        engine: PredictionEngine,
        onOpenSystemSettings: @escaping () -> Void = PredictionNoticeView.openSystemSettings
    ) {
        self.engine = engine
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
                Toggle("Word completions", isOn: $engine.wordsEnabled)
            } footer: {
                Text("Completions for the word at the caret show above the keys. They come from the macOS spell checker.")
            }
        }
        .formStyle(.grouped)
        .onAppear { engine.refreshAvailability() }
    }
}
