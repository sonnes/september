'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useDebounce } from '@/hooks/use-debounce';
import { toast } from 'sonner';

import { useAccountContext } from '@/packages/account';
import { useAISettings } from '@/packages/ai';
import { useSpeechContext, VoicesList } from '@/packages/speech';
import type { SpeechConfig } from '@/types/ai-config';
import type { Voice } from '@/types/voice';

import { useOnboarding } from '@/packages/onboarding/components/onboarding-provider';

type SpeechEngineId = 'browser' | 'gemini' | 'elevenlabs';

interface ProviderOption {
  id: SpeechEngineId;
  name: string;
  description: string;
  requiresApiKey: boolean;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'browser',
    name: 'Browser TTS',
    description: 'Free, built-in browser speech synthesis. No API key required.',
    requiresApiKey: false,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Natural-sounding voices powered by Google AI.',
    requiresApiKey: true,
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'High-quality, realistic voice synthesis.',
    requiresApiKey: true,
  },
];

export function SpeechStep() {
  const { goToNextStep, goToPreviousStep } = useOnboarding();
  const { account } = useAccountContext();
  const { speechConfig, updateSpeechConfig, getProviderConfig } = useAISettings();
  const { listVoices, getProvider } = useSpeechContext();

  const [selectedProvider, setSelectedProvider] = useState<SpeechEngineId>(
    speechConfig.provider || 'browser'
  );
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Check which providers have API keys configured
  const hasGeminiApiKey = !!account?.ai_providers?.gemini?.api_key;
  const hasElevenLabsApiKey = !!account?.ai_providers?.elevenlabs?.api_key;

  // Filter providers based on available API keys
  const availableProviders = useMemo(() => {
    return PROVIDER_OPTIONS.filter(provider => {
      if (!provider.requiresApiKey) return true;
      if (provider.id === 'gemini') return hasGeminiApiKey;
      if (provider.id === 'elevenlabs') return hasElevenLabsApiKey;
      return false;
    });
  }, [hasGeminiApiKey, hasElevenLabsApiKey]);

  // Fetch voices for selected provider
  const fetchVoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const provider = getProvider(selectedProvider);
      if (provider) {
        const apiKey = getProviderConfig(selectedProvider)?.api_key;
        const fetchedVoices = await provider.listVoices({ search: debouncedSearchTerm, apiKey });
        setVoices(fetchedVoices || []);
      }
    } catch (err) {
      console.error('Error fetching voices:', err);
      setVoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProvider, debouncedSearchTerm, getProvider, getProviderConfig]);

  // Fetch voices when provider or search changes
  useEffect(() => {
    fetchVoices();
  }, [fetchVoices]);

  // Initialize selected voice from current speech config
  useEffect(() => {
    if (speechConfig.voice_id && speechConfig.voice_name) {
      setSelectedVoice({
        id: speechConfig.voice_id,
        name: speechConfig.voice_name,
        language: 'en-US',
      });
    }
  }, [speechConfig.voice_id, speechConfig.voice_name]);

  const handleProviderChange = (providerId: SpeechEngineId) => {
    setSelectedProvider(providerId);
    setSelectedVoice(undefined);
    setSearchTerm('');
  };

  const handleVoiceSelect = (voice: Voice) => {
    setSelectedVoice(voice);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const speechConfig: Partial<SpeechConfig> = {
        provider: selectedProvider,
      };

      if (selectedVoice) {
        speechConfig.voice_id = selectedVoice.id;
        speechConfig.voice_name = selectedVoice.name;
      }

      await updateSpeechConfig(speechConfig);

      toast.success('Voice Settings Saved', {
        description: 'Your voice preferences have been configured.',
      });

      goToNextStep();
    } catch (err) {
      console.error('Error saving speech settings:', err);
      toast.error('Failed to save voice settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    goToNextStep();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Choose Your Voice</h2>
        <p className="mt-2 text-muted-foreground">
          Select a speech provider and voice for text-to-speech. You can always change this later in
          settings.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-900">Speech Provider</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {availableProviders.map(provider => (
            <Card
              key={provider.id}
              className={`cursor-pointer transition-all ${
                selectedProvider === provider.id
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-zinc-300'
              }`}
              onClick={() => handleProviderChange(provider.id)}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-sm">{provider.name}</CardTitle>
                <CardDescription className="text-xs">{provider.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {availableProviders.length < PROVIDER_OPTIONS.length && (
          <p className="text-xs text-muted-foreground">
            Some providers are hidden because their API keys are not configured. Go back to add API
            keys for more options.
          </p>
        )}
      </div>

      {/* Voice Search */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-900">Select a Voice</h3>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-zinc-400" />
          </div>
          <Input
            type="text"
            placeholder="Search voices..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Voices List */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-4 text-sm text-muted-foreground">Loading voices...</p>
              </div>
            </CardContent>
          </Card>
        ) : voices.length > 0 ? (
          <VoicesList
            voices={voices}
            selectedVoiceId={selectedVoice?.id}
            onSelectVoice={handleVoiceSelect}
          />
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-sm text-muted-foreground">
                No voices found. Try a different search term or provider.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected Voice Info */}
      {selectedVoice && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm">
            <span className="font-medium">Selected:</span> {selectedVoice.name}
            {selectedVoice.gender && (
              <span className="text-muted-foreground"> · {selectedVoice.gender}</span>
            )}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button type="button" variant="ghost" onClick={goToPreviousStep}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleSkip}>
            Skip for Now
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save & Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

