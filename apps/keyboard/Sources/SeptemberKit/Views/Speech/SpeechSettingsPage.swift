import SwiftUI

/// The Speech page of Settings: the speed, the volume, and the Return key in
/// Talk mode.
public struct SpeechSettingsPage: View {
    @ObservedObject private var settings: VoiceSettingsStore
    private let speaker: Speaker
    private let returnSpeaks: Binding<Bool>?

    /// `returnSpeaks` is the Talk mode setting of Return. Talk mode owns it.
    /// With `nil`, the page does not show the switch.
    public init(speech: SpeechServices, returnSpeaks: Binding<Bool>? = nil) {
        settings = speech.settings
        speaker = speech.speaker
        self.returnSpeaks = returnSpeaks
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

            if let returnSpeaks {
                Section("Talk Mode") {
                    Toggle("Return speaks the text in the bar", isOn: returnSpeaks)
                }
            }
        }
        .formStyle(.grouped)
    }
}
