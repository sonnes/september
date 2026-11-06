import SwiftUI

/// The Voice page of Settings: the service, the macOS voices and Personal
/// Voice, and the ElevenLabs key, models, Expression, and voices.
public struct VoiceSettingsPage: View {
    @ObservedObject private var settings: VoiceSettingsStore
    @ObservedObject private var account: ElevenLabsAccount
    @ObservedObject private var voices: SystemVoiceCatalog
    private let preview: VoicePreview
    @State private var pastedKey = ""

    public init(speech: SpeechServices) {
        settings = speech.settings
        account = speech.account
        voices = speech.voices
        preview = speech.preview
    }

    public var body: some View {
        Form {
            Section {
                Picker("Service", selection: $settings.value.provider) {
                    Text("macOS").tag(SpeechProvider.system)
                    Text("ElevenLabs").tag(SpeechProvider.elevenLabs)
                }
                .pickerStyle(.segmented)
                if settings.value.provider == .elevenLabs, case .connected(let subscription) = account.status {
                    connectedRow(subscription)
                }
            }

            switch settings.value.provider {
            case .system:
                systemSections
            case .elevenLabs where account.isConnected:
                elevenLabsSections
            case .elevenLabs:
                connectSections
            }
        }
        .formStyle(.grouped)
        .onAppear { voices.refresh() }
        .onDisappear { preview.stop() }
    }

    // MARK: - macOS voices

    @ViewBuilder
    private var systemSections: some View {
        Section {
            switch voices.personalVoiceAccess {
            case .allowed where !voices.personal.isEmpty:
                ForEach(voices.personal) { voice in
                    systemVoiceRow(voice, detail: "Made on this Mac")
                }
            case .notAsked:
                HStack(spacing: Metrics.SpeechSettings.rowSpacing) {
                    Text("Use my Personal Voice")
                    Spacer()
                    Button("Allow") { Task { await voices.requestPersonalVoice() } }
                }
            default:
                Text("No Personal Voice is available to the keyboard.")
                    .foregroundStyle(.secondary)
            }
        } header: {
            Text("Personal Voice")
        } footer: {
            footnote("To make a Personal Voice, open System Settings, Accessibility, Personal Voice.")
        }

        Section {
            ForEach(voices.system) { voice in
                systemVoiceRow(voice, detail: voice.quality.label)
            }
        } header: {
            Text("System Voices")
        } footer: {
            footnote(
                "The list shows the English voices on this Mac. To add a voice, open System Settings, Accessibility, Spoken Content."
            )
        }
    }

    private var chosenSystemVoiceID: String? {
        settings.value.systemVoiceID ?? voices.defaultVoiceID
    }

    private func systemVoiceRow(_ voice: SystemVoice, detail: String) -> some View {
        ChoiceRow(title: voice.name, detail: detail, isSelected: voice.id == chosenSystemVoiceID) {
            settings.value.systemVoiceID = voice.id
        } onPlay: {
            preview.play(systemVoice: voice.id, settings: settings.value)
        }
    }

    // MARK: - ElevenLabs

    private func connectedRow(_ subscription: ElevenLabsSubscription) -> some View {
        HStack(spacing: Metrics.SpeechSettings.rowSpacing) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Color(Tokens.positive))
            VStack(alignment: .leading, spacing: Metrics.SpeechSettings.detailSpacing) {
                Text("Connected")
                Text(subscription.summary())
                    .font(Typography.settingsDetail)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Disconnect") { account.disconnect() }
        }
    }

    @ViewBuilder
    private var connectSections: some View {
        Section {
            if account.septemberHasKey {
                HStack(spacing: Metrics.SpeechSettings.rowSpacing) {
                    Image(systemName: "key.fill")
                        .foregroundStyle(.secondary)
                    VStack(alignment: .leading, spacing: Metrics.SpeechSettings.detailSpacing) {
                        Text("Use the key from September")
                        Text("The September app on this Mac has an ElevenLabs key.")
                            .font(Typography.settingsDetail)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Use This Key") { Task { await account.useSeptemberKey() } }
                        .buttonStyle(.borderedProminent)
                        .disabled(account.status == .connecting)
                }
            }
            HStack(spacing: Metrics.SpeechSettings.rowSpacing) {
                SecureField("API key", text: $pastedKey, prompt: Text("Paste an API key"))
                    .labelsHidden()
                Button("Connect") {
                    let key = pastedKey
                    pastedKey = ""
                    Task { await account.connect(key: key) }
                }
                .disabled(pastedKey.isEmpty || account.status == .connecting)
            }
            if case .failed(let message) = account.status {
                Text(message)
                    .foregroundStyle(Color(Tokens.warning))
            }
        } header: {
            Text("Connect ElevenLabs")
        } footer: {
            footnote("The key stays in the macOS Keychain. Get a key at elevenlabs.io, in Developers, API Keys.")
        }

        Section {
            if let voice = voices.system.first(where: { $0.id == chosenSystemVoiceID })
                ?? voices.personal.first(where: { $0.id == chosenSystemVoiceID })
            {
                systemVoiceRow(voice, detail: "macOS, \(voice.isPersonal ? "Personal Voice" : voice.quality.label)")
            }
        } header: {
            Text("Until ElevenLabs Is Connected")
        } footer: {
            footnote("The keyboard speaks with the macOS voice.")
        }
    }

    @ViewBuilder
    private var elevenLabsSections: some View {
        Section("Model") {
            ForEach(VoiceModel.all) { model in
                ChoiceRow(
                    title: model.name, detail: model.detail, isSelected: model.id == settings.value.modelID
                ) {
                    settings.value.modelID = model.id
                }
            }
        }

        Section("Expression") {
            Picker("Style", selection: $settings.value.expression) {
                ForEach(Expression.allCases, id: \.self) { expression in
                    Text(expression.label).tag(expression)
                }
            }
            .pickerStyle(.segmented)
        }

        let groups = ElevenLabsVoice.grouped(account.voices)
        ForEach(groups.indices, id: \.self) { index in
            let group = groups[index]
            Section {
                ForEach(group.voices) { voice in
                    ChoiceRow(
                        title: voice.name, detail: voice.detail,
                        isSelected: voice.id == settings.value.elevenLabsVoiceID
                    ) {
                        settings.value.elevenLabsVoiceID = voice.id
                    } onPlay: {
                        guard let url = voice.previewURL else { return }
                        preview.play(sample: url, volume: settings.value.volume)
                    }
                }
            } header: {
                Text(group.group.title)
            } footer: {
                if index == groups.count - 1 {
                    footnote(
                        "Play uses the sample of the voice and costs no credits. If ElevenLabs fails, the keyboard speaks the same words with the macOS voice."
                    )
                }
            }
        }
    }

    private func footnote(_ text: String) -> some View {
        Text(text)
            .font(Typography.settingsDetail)
            .foregroundStyle(.secondary)
    }
}

/// A row that picks one item of a group, with an optional Play button.
struct ChoiceRow: View {
    let title: String
    let detail: String?
    let isSelected: Bool
    let onSelect: () -> Void
    var onPlay: (() -> Void)?

    var body: some View {
        HStack(spacing: Metrics.SpeechSettings.rowSpacing) {
            HStack(spacing: Metrics.SpeechSettings.rowSpacing) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .resizable()
                    .frame(width: Metrics.SpeechSettings.radio, height: Metrics.SpeechSettings.radio)
                    .foregroundStyle(isSelected ? Color(Tokens.accent) : .secondary)
                VStack(alignment: .leading, spacing: Metrics.SpeechSettings.detailSpacing) {
                    Text(title)
                    if let detail {
                        Text(detail)
                            .font(Typography.settingsDetail)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
            }
            .pressable(
                label: [title, detail].compactMap { $0 }.joined(separator: ", "), isSelected: isSelected,
                onPressing: { _ in }, action: onSelect)

            if let onPlay {
                Button(action: onPlay) {
                    Label("Play", systemImage: "play.fill")
                }
                .accessibilityLabel("Play \(title)")
            }
        }
    }
}
