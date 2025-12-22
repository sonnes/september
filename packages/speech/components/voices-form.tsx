'use client';

import { useForm } from 'react-hook-form';

import { AI_PROVIDERS } from '@/packages/ai';
import { useVoicesLogic } from '@/packages/speech/hooks/use-voices-logic';
import { VoiceSettingsFormData } from '@/packages/speech/types/schemas';
import type { Account } from '@/packages/account';
import type { Voice } from '@/types/voice';

type SpeechProvider = 'browser' | 'gemini' | 'elevenlabs';

interface VoicesFormProps {
  account?: Account;
  onSubmit: (data: VoiceSettingsFormData) => Promise<void>;
  children: (props: {
    form: ReturnType<typeof useForm<VoiceSettingsFormData>>;
    selectedProvider: SpeechProvider;
    availableProviders: typeof AI_PROVIDERS;
    availableModels: Array<{ id: string; name: string; description?: string }>;
    voices: Voice[];
    isLoadingVoices: boolean;
    searchTerm: string;
    onProviderChange: (provider: SpeechProvider) => void;
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
  } = useVoicesLogic(account, onSubmit);

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
