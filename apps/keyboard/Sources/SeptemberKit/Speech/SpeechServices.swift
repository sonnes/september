import Foundation

/// The speech parts of the keyboard, made together so that they share one
/// settings store and one ElevenLabs account.
@MainActor
public final class SpeechServices {
    public let settings: VoiceSettingsStore
    public let account: ElevenLabsAccount
    public let voices: SystemVoiceCatalog
    public let preview: VoicePreview
    public let speaker: Speaker

    public init(
        defaults: UserDefaults = .standard,
        secrets: any SecretStore = KeychainStore(),
        client: ElevenLabsClient = ElevenLabsClient()
    ) {
        settings = VoiceSettingsStore(defaults: defaults)
        account = ElevenLabsAccount(keychain: ElevenLabsKeychain(store: secrets), client: client)
        voices = SystemVoiceCatalog()
        preview = VoicePreview()
        speaker = Speaker(settings: settings, system: SystemSpeech(), elevenLabs: ElevenLabsSpeech(account: account))
    }

    /// Lists the macOS voices and reads the saved ElevenLabs key. It never
    /// asks for a permission.
    public func start() {
        voices.refresh()
        Task { await account.load() }
    }
}
