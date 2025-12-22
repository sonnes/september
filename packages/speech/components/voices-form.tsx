'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { Account } from '@/types/account';
import type { Voice } from '@/types/voice';
import { AI_PROVIDERS, getModelsForProvider, getProvidersForFeature } from '@/services/ai';
import { useSpeechContext } from './speech-provider';
import { VoiceSettingsFormData, VoiceSettingsSchema } from '../types/schemas';

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
    onVoiceSelect: (voice: Voice) => void;
    onModelChange: (modelId: string) => void;
    hasApiKey: (providerId: string) => boolean;
  }) => React.ReactNode;
}

export function VoicesForm({ account, onSubmit, children }: VoicesFormProps) {
  const { getProvider } = useSpeechContext();

  // Get speech providers from registry
  const speechProviders = useMemo(() => {
    const providers = getProvidersForFeature('speech');
    return providers.reduce(
      (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
      },
      {} as typeof AI_PROVIDERS
    );
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
    try {
      await onSubmit(data);

      toast.success('Voice Settings Saved', {
        description: 'Your voice preferences have been configured.',
      });
    } catch (err) {
      console.error('Error saving voice settings:', err);
      toast.error('Failed to save voice settings. Please try again.');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {children({
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
      })}
    </form>
  );
}

