import SwiftUI

/// The Speech page of Settings: the speed, the volume, and the Return key in
/// Talk mode.
public struct SpeechSettingsPage: View {
    @ObservedObject private var settings: VoiceSettingsStore
    private let speaker: Speaker
    private let returnSpeaks: Binding<Bool>?
    private let onClearTalkHistory: (() -> Void)?
    @State private var confirmsClear = false

    /// `returnSpeaks` is the Talk mode setting of Return. Talk mode owns it.
    /// With `nil`, the page does not show the switch. With
    /// `onClearTalkHistory`, the page shows Clear Talk History.
    public init(
        speech: SpeechServices, returnSpeaks: Binding<Bool>? = nil, onClearTalkHistory: (() -> Void)? = nil
    ) {
        settings = speech.settings
        speaker = speech.speaker
        self.returnSpeaks = returnSpeaks
        self.onClearTalkHistory = onClearTalkHistory
    }

    public var body: some View {
        Form {
            Section {
                LabeledContent("Speed") {
                    HStack(spacing: Metrics.SpeechSettings.rowSpacing) {
                        Slider(value: $settings.value.speed, in: VoiceSettings.speedRange) {
                            Text("Speed")
                        }
                        .labelsHidden()
                        Text(settings.value.speed.formatted(.number.precision(.fractionLength(1))) + "×")
                            .monospacedDigit()
                            .frame(width: Metrics.SpeechSettings.valueWidth, alignment: .trailing)
                    }
                }
                LabeledContent("Volume") {
                    HStack(spacing: Metrics.SpeechSettings.rowSpacing) {
                        Slider(value: $settings.value.volume, in: VoiceSettings.volumeRange) {
                            Text("Volume")
                        }
                        .labelsHidden()
                        Text(settings.value.volume.formatted(.percent.precision(.fractionLength(0))))
                            .monospacedDigit()
                            .frame(width: Metrics.SpeechSettings.valueWidth, alignment: .trailing)
                    }
                }
                HStack {
                    Spacer()
                    Button("Play a Sample") { speaker.speak(VoicePreview.sampleText) }
                }
            }

            if returnSpeaks != nil || onClearTalkHistory != nil {
                Section {
                    if let returnSpeaks {
                        Toggle("Return speaks the text in the bar", isOn: returnSpeaks)
                    }
                    if let onClearTalkHistory {
                        HStack {
                            Spacer()
                            Button("Clear Talk History…") { confirmsClear = true }
                        }
                        .confirmationDialog(
                            "Clear the Talk history?", isPresented: $confirmsClear
                        ) {
                            Button("Clear Talk History", role: .destructive, action: onClearTalkHistory)
                        } message: {
                            Text("The Said list loses every line. You cannot undo this.")
                        }
                    }
                } header: {
                    Text("Talk Mode")
                } footer: {
                    if onClearTalkHistory != nil {
                        Text(
                            "Talk mode keeps what you said for 30 days on this Mac. The predictions of Talk mode use the last hour. Type mode does not use it."
                        )
                    }
                }
            }
        }
        .formStyle(.grouped)
    }
}
