export type VoiceSetupProvider = 'browser' | 'elevenlabs' | 'gemini';

export function shouldShowVoiceProviderConfig(provider: VoiceSetupProvider) {
  return provider !== 'browser';
}

export function shouldShowVoiceOptionDescription(
  provider: VoiceSetupProvider,
  selectedProvider: VoiceSetupProvider
) {
  return provider === selectedProvider;
}
