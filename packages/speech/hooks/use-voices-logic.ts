'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { getModelsForProvider, getProvidersForFeature } from '@/packages/ai';
import { useSpeechContext } from '@/packages/speech/components/speech-provider';
import { VoiceSettingsFormData, VoiceSettingsSchema } from '@/packages/speech/types/schemas';
import type { Account } from '@/types/account';
import type { Voice } from '@/types/voice';

type SpeechProvider = 'browser' | 'gemini' | 'elevenlabs';

export function useVoicesLogic(
  account: Account | undefined,
  onSubmit: (data: VoiceSettingsFormData) => Promise<void>
) {
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
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get available models for selected provider
  const availableModels = useMemo(() => {
    return getModelsForProvider(selectedProvider);
  }, [selectedProvider]);

  // Check which providers have API keys configured
  const hasApiKey = useCallback(
    (providerId: string) => {
      return !!account?.ai_providers?.[providerId as keyof typeof account.ai_providers]?.api_key;
    },
    [account]
  );

  // Fetch voices for the selected provider
  const fetchVoices = useCallback(
    async (provider: SpeechProvider, search: string) => {
      try {
        setIsLoadingVoices(true);
        const speechProvider = getProvider(provider);
        if (speechProvider) {
          const apiKey =
            account?.ai_providers?.[provider as keyof typeof account.ai_providers]?.api_key;
          const fetchedVoices = await speechProvider.listVoices({ search, apiKey });
          setVoices(fetchedVoices || []);
        }
      } catch (err) {
        console.error('Error fetching voices:', err);
        setVoices([]);
      } finally {
        setIsLoadingVoices(false);
      }
    },
    [getProvider, account]
  );

  // Fetch voices when provider or search term changes
  useEffect(() => {
    fetchVoices(selectedProvider, searchTerm);
  }, [selectedProvider, searchTerm, fetchVoices]);

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
