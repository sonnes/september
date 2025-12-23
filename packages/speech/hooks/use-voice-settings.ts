'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { getProvidersForFeature } from '@/packages/ai';
import { useSpeechContext } from '@/packages/speech/components/speech-provider';
import { useVoiceFetching } from '@/packages/speech/hooks/use-voice-fetching';
import { useProviderModels } from '@/packages/speech/hooks/use-provider-models';
import { VoiceSettingsFormData, VoiceSettingsSchema } from '@/packages/speech/types/schemas';
import type { Account } from '@/packages/account';
import type { Voice } from '@/types/voice';

type SpeechProvider = 'browser' | 'gemini' | 'elevenlabs';

export interface UseVoiceSettingsReturn {
  form: ReturnType<typeof useForm<VoiceSettingsFormData>>;
  selectedProvider: SpeechProvider;
  availableProviders: Record<string, any>;
  availableModels: Array<{ id: string; name: string; description?: string }>;
  voices: Voice[];
  isLoadingVoices: boolean;
  searchTerm: string;
  onProviderChange: (provider: SpeechProvider) => void;
  onSearchChange: (value: string) => void;
  onVoiceSelect: (voice: Voice) => void;
  onModelChange: (modelId: string) => void;
  hasApiKey: (providerId: string) => boolean;
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => Promise<void>;
  error: string | null;
  success: boolean;
}

export function useVoiceSettings(
  account: Account | undefined,
  onSubmit: (data: VoiceSettingsFormData) => Promise<void>
): UseVoiceSettingsReturn {
  const { getProvider } = useSpeechContext();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get speech providers from registry
  const speechProviders = useMemo(() => {
    const providers = getProvidersForFeature('speech');
    return providers.reduce((acc, provider) => {
      acc[provider.id] = provider;
      return acc;
    }, {} as any);
  }, []);

  // Get current speech config from account
  const currentProvider = (account?.ai_speech?.provider || 'browser') as SpeechProvider;
  const currentVoiceId = account?.ai_speech?.voice_id;
  const currentVoiceName = account?.ai_speech?.voice_name;
  const currentModelId = account?.ai_speech?.model_id;

  const form = useForm<VoiceSettingsFormData>({
    resolver: zodResolver(VoiceSettingsSchema),
    defaultValues: {
      provider: currentProvider,
      voice_id: currentVoiceId || '',
      voice_name: currentVoiceName || '',
      model_id: currentModelId || '',
    },
  });

  const [selectedProvider, setSelectedProvider] = useState<SpeechProvider>(currentProvider);
  const [searchTerm, setSearchTerm] = useState('');

  // Use composed hooks
  const apiKey =
    account?.ai_providers?.[selectedProvider as keyof typeof account.ai_providers]?.api_key;
  const { voices, isLoading: isLoadingVoices } = useVoiceFetching(selectedProvider, apiKey);
  const { models: availableModels } = useProviderModels(selectedProvider);

  // Check which providers have API keys configured
  const hasApiKey = useCallback(
    (providerId: string) => {
      return !!account?.ai_providers?.[providerId as keyof typeof account.ai_providers]?.api_key;
    },
    [account]
  );

  const handleProviderChange = useCallback(
    (provider: SpeechProvider) => {
      setSelectedProvider(provider);
      form.setValue('provider', provider);
      form.setValue('voice_id', '');
      form.setValue('voice_name', '');
      form.setValue('model_id', '');
      setSearchTerm('');
    },
    [form]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleVoiceSelect = useCallback(
    (voice: Voice) => {
      form.setValue('voice_id', voice.id);
      form.setValue('voice_name', voice.name);
    },
    [form]
  );

  const handleModelChange = useCallback(
    (modelId: string) => {
      form.setValue('model_id', modelId);
    },
    [form]
  );

  const handleSubmit = async (data: VoiceSettingsFormData) => {
    setError(null);
    setSuccess(false);
    try {
      await onSubmit(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving voice settings:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to save voice settings. Please try again.'
      );
    }
  };

  return {
    form,
    selectedProvider,
    availableProviders: speechProviders,
    availableModels,
    voices,
    isLoadingVoices,
    searchTerm,
    onProviderChange: handleProviderChange,
    onSearchChange: handleSearchChange,
    onVoiceSelect: handleVoiceSelect,
    onModelChange: handleModelChange,
    hasApiKey,
    handleSubmit: form.handleSubmit(handleSubmit),
    error,
    success,
  };
}
