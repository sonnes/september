import SwiftUI

// MARK: - TTSSettingsView
//
// Text-to-Speech settings pane matching design: settings-text-to-speech.png
//
// Layout:
//   Title: "Text to Speech"
//   Subtitle: "Choose a voice engine and customize playback."
//   Divider
//   Engine selection cards (3)
//   API Key field (conditional)
//   Voice dropdown
//   Speed slider (0.5x–2.0x)
//   Preview Voice button

struct TTSSettingsView: View {
    @Bindable var account: Account
    @State private var apiKeyInput = ""
    @State private var availableVoices: [Voice] = []
    @State private var isLoadingVoices = false
    @State private var coordinator = SpeechCoordinator()

    private var config: SpeechConfig {
        account.aiSpeech
    }

    private var providerRequiresAPIKey: Bool {
        config.provider == .openaiTTS || config.provider == .elevenlabs
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    Text("Text to Speech")
                        .font(.system(size: 24, weight: .bold))
                    Text("Choose a voice engine and customize playback.")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }

                Divider()

                // Engine cards
                VStack(alignment: .leading, spacing: 10) {
                    Text("Engine")
                        .font(.system(size: 13, weight: .medium))

                    HStack(spacing: 12) {
                        engineCard(
                            provider: .avSpeech,
                            icon: "waveform",
                            name: "Apple AVSpeech",
                            subtitle: "Built-in, offline"
                        )
                        engineCard(
                            provider: .openaiTTS,
                            icon: "sparkles",
                            name: "OpenAI TTS",
                            subtitle: "HD voices, cloud"
                        )
                        engineCard(
                            provider: .elevenlabs,
                            icon: "person.wave.2",
                            name: "ElevenLabs",
                            subtitle: "Natural voices"
                        )
                    }
                }

                // API Key (only for providers that need it)
                if providerRequiresAPIKey {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("API Key")
                            .font(.system(size: 13, weight: .medium))

                        SecureField(
                            account.maskedAPIKey(for: config.provider) ?? "Enter API key",
                            text: $apiKeyInput
                        )
                        .textFieldStyle(.roundedBorder)
                        .font(.system(size: 13, design: .monospaced))
                        .onSubmit { saveAPIKey() }
                        .onChange(of: apiKeyInput) { _, _ in saveAPIKey() }
                    }
                }

                // Voice dropdown
                VStack(alignment: .leading, spacing: 6) {
                    Text("Voice")
                        .font(.system(size: 13, weight: .medium))

                    Picker("Voice", selection: voiceBinding) {
                        Text("Default").tag(String?.none)
                        ForEach(availableVoices) { voice in
                            Text("\(voice.name) (\(voice.language))").tag(Optional(voice.id))
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .strokeBorder(Color(nsColor: .separatorColor), lineWidth: 1)
                    )
                }

                // Speed slider
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("Speed")
                            .font(.system(size: 13, weight: .medium))
                        Spacer()
                        Text(String(format: "%.1fx", config.speed))
                            .font(.system(size: 13, design: .monospaced))
                            .foregroundStyle(.secondary)
                    }

                    Slider(
                        value: $account.aiSpeech.speed,
                        in: 0.5...2.0,
                        step: 0.1
                    )
                    .tint(.blue)
                }

                // Preview Voice button
                VStack(alignment: .leading, spacing: 6) {
                    Button {
                        previewVoice()
                    } label: {
                        HStack {
                            Image(systemName: coordinator.isSpeaking ? "stop.fill" : "play.fill")
                            Text(coordinator.isSpeaking ? "Stop Preview" : "Preview Voice")
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.blue)
                        )
                        .foregroundStyle(.white)
                        .font(.system(size: 13, weight: .medium))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(
                        coordinator.isSpeaking ? "Stop preview" : "Preview voice")

                    Text("Plays a short sample with current settings")
                        .font(.system(size: 11))
                        .foregroundStyle(.tertiary)
                }

                Spacer()
            }
            .padding(32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .onAppear {
            apiKeyInput = account.apiKey(for: config.provider) ?? ""
            loadVoices()
        }
        .onChange(of: config.provider) { _, _ in
            apiKeyInput = account.apiKey(for: config.provider) ?? ""
            account.aiSpeech.voiceId = nil
            account.aiSpeech.voiceName = nil
            loadVoices()
        }
    }

    // MARK: - Engine Card

    private func engineCard(
        provider: SpeechProvider, icon: String, name: String, subtitle: String
    ) -> some View {
        let isSelected = config.provider == provider

        return Button {
            account.aiSpeech.provider = provider
        } label: {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 24))
                    .foregroundStyle(isSelected ? .blue : .secondary)
                Text(name)
                    .font(.system(size: 13, weight: .medium))
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(
                        isSelected ? Color.blue : Color(nsColor: .separatorColor),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(name) engine")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Helpers

    private var voiceBinding: Binding<String?> {
        Binding(
            get: { config.voiceId },
            set: { newValue in
                account.aiSpeech.voiceId = newValue
                account.aiSpeech.voiceName = availableVoices.first { $0.id == newValue }?.name
            }
        )
    }

    private func saveAPIKey() {
        guard !apiKeyInput.isEmpty else { return }
        account.setAPIKey(apiKeyInput, for: config.provider)
    }

    private func loadVoices() {
        isLoadingVoices = true
        Task {
            let apiKey = account.apiKey(for: config.provider)
            availableVoices = await coordinator.voices(for: config.provider, apiKey: apiKey)
            isLoadingVoices = false
        }
    }

    private func previewVoice() {
        if coordinator.isSpeaking {
            coordinator.stop()
        } else {
            let apiKey = account.apiKey(for: config.provider)
            coordinator.speak(
                text: "Hello, I'm your voice assistant.",
                config: config,
                apiKey: apiKey
            )
        }
    }
}
