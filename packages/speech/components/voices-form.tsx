'use client';

import { useForm } from 'react-hook-form';

import { AI_PROVIDERS } from '@september/ai';
import { useVoiceSettings } from '@september/speech/hooks/use-voice-settings';
import { VoiceSettingsFormData } from '@september/speech/types/schemas';
import type { Account } from '@september/account';
import type { Voice } from '@september/shared/types/voice';

type SpeechEngineId = 'browser' | 'gemini' | 'elevenlabs';

interface VoicesFormProps {
  account?: Account;
  onSubmit: (data: VoiceSettingsFormData) => Promise<void>;
  children: (props: {
    form: ReturnType<typeof useForm<VoiceSettingsFormData>>;
    selectedProvider: SpeechEngineId;
    availableProviders: typeof AI_PROVIDERS;
    availableModels: Array<{ id: string; name: string; description?: string }>;
    voices: Voice[];
    isLoadingVoices: boolean;
    searchTerm: string;
    onProviderChange: (provider: SpeechEngineId) => void;
    onSearchChange: (value: string) => void;
    onVoiceSelect: (voice: Voice) => void;
    onModelChange: (modelId: string) => void;
    hasApiKey: (providerId: string) => boolean;
    error: string | null;
    success: boolean;
  }) => React.ReactNode;
}

export function VoicesForm({ account, onSubmit, children }: VoicesFormProps) {
  const {
    form,
    selectedProvider,
    availableProviders,
    availableModels,
    voices,
    isLoadingVoices,
    searchTerm,
    onProviderChange,
    onSearchChange,
    onVoiceSelect,
    onModelChange,
    hasApiKey,
    handleSubmit,
    error,
    success,
  } = useVoiceSettings(account, onSubmit);

  return (
    <form onSubmit={handleSubmit}>
      {children({
        form,
        selectedProvider,
        availableProviders,
        availableModels,
        voices,
        isLoadingVoices,
        searchTerm,
        onProviderChange,
        onSearchChange,
        onVoiceSelect,
        onModelChange,
        hasApiKey,
        error,
        success,
      })}
    </form>
  );
}
