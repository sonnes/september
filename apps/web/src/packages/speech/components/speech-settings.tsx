'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { Account } from '@/packages/account';
import { Alert, AlertDescription, AlertTitle } from '@/packages/ui/components/alert';
import { Button } from '@/packages/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/packages/ui/components/card';
import { FormCheckbox, FormSelect, FormSlider } from '@/packages/ui/components/form';
import { Input } from '@/packages/ui/components/input';
import { Spinner } from '@/packages/ui/components/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/packages/ui/components/tabs';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { useVoiceSettings } from '../hooks/use-voice-settings';
import type { SpeechEngineId } from '../hooks/use-voice-settings';
import type { VoiceSettingsFormData } from '../types/schemas';
import { VoicesList } from './voices-list';

interface SpeechSettingsProps {
  account: Account;
  onSubmit: (data: VoiceSettingsFormData) => Promise<void>;
}

export function SpeechSettings({ account, onSubmit }: SpeechSettingsProps) {
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

  const selectedVoiceId = form.watch('voice_id');
  const selectedModelId = form.watch('model_id');

  const allProviders = Object.values(availableProviders);
  const visibleProviders = allProviders.filter(provider => {
    if (!provider.requires_api_key) return true;
    return hasApiKey(provider.id);
  });

  return (
    <form id="speech-settings-form" onSubmit={handleSubmit}>
      <div className="space-y-6 pb-6">
        <Tabs defaultValue="voice" className="gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="provider">Provider</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="speech">Speech</TabsTrigger>
          </TabsList>

          <TabsContent value="provider">
            {/* Provider Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-900">Speech Provider</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {visibleProviders.map(provider => (
                  <Card
                    key={provider.id}
                    className={`cursor-pointer transition-all ${
                      selectedProvider === provider.id
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:border-zinc-300'
                    }`}
                    onClick={() => onProviderChange(provider.id as SpeechEngineId)}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">{provider.name}</CardTitle>
                      <CardDescription className="text-xs">{provider.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {visibleProviders.length < allProviders.length && (
                <p className="text-xs text-muted-foreground">
                  Some providers are hidden because their API keys are not configured. Configure API
                  keys in{' '}
                  <a href="/settings/providers" className="text-primary hover:underline">
                    AI Providers settings
                  </a>
                  .
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-6">
            {/* Model Selection */}
            {availableModels.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-900">Model</h3>
                <FormSelect
                  name="model_id"
                  control={form.control}
                  label="Model"
                  options={availableModels.map(model => ({ id: model.id, name: model.name }))}
                />
              </div>
            )}

            {/* Voice Search */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-900">Select a Voice</h3>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-zinc-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search voices by name, gender, accent, or description..."
                  value={searchTerm}
                  onChange={e => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Voices List */}
            {isLoadingVoices ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex flex-col items-center">
                    <Spinner className="h-8 w-8 text-primary" />
                    <p className="mt-4 text-sm text-muted-foreground">Loading voices...</p>
                  </div>
                </CardContent>
              </Card>
            ) : voices.length > 0 ? (
              <VoicesList
                voices={voices}
                selectedVoiceId={selectedVoiceId}
                onSelectVoice={onVoiceSelect}
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
          </TabsContent>

          <TabsContent value="speech" className="space-y-6">
            {/* Advanced Settings — Browser */}
            {selectedProvider === 'browser' && (
              <div>
                <div className="px-4 mb-4">
                  <h3 className="text-base/7 font-semibold text-zinc-900">Browser TTS Settings</h3>
                  <p className="mt-1 text-sm/6 text-zinc-600">
                    Customize the speech synthesis settings for browser text-to-speech.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Speed</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Controls how fast the voice speaks.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSlider
                        name="settings.speed"
                        control={form.control}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        leftLabel="Slower"
                        rightLabel="Faster"
                        showValue
                        valueFormatter={value => `${value}x`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Pitch</h4>
                      <p className="mt-1 text-sm text-zinc-600">Controls the pitch of the voice.</p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSlider
                        name="settings.pitch"
                        control={form.control}
                        min={-20}
                        max={20}
                        step={1}
                        leftLabel="Lower"
                        rightLabel="Higher"
                        showValue
                        valueFormatter={value => value.toString()}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Volume</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Controls the volume of the voice.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSlider
                        name="settings.volume"
                        control={form.control}
                        min={0}
                        max={1}
                        step={0.1}
                        leftLabel="Quieter"
                        rightLabel="Louder"
                        showValue
                        valueFormatter={value => `${Math.round(value * 100)}%`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings — ElevenLabs */}
            {selectedProvider === 'elevenlabs' && (
              <div>
                <div className="px-4 mb-4">
                  <h3 className="text-base/7 font-semibold text-zinc-900">ElevenLabs Settings</h3>
                  <p className="mt-1 text-sm/6 text-zinc-600">
                    Fine-tune voice characteristics for ElevenLabs text-to-speech.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Speed</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Controls how fast the voice speaks.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSlider
                        name="settings.speed"
                        control={form.control}
                        min={0.7}
                        max={1.2}
                        step={0.1}
                        leftLabel="Slower"
                        rightLabel="Faster"
                        showValue
                        valueFormatter={value => `${value}x`}
                        disabled={!hasApiKey(selectedProvider)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Stability</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Higher values make the voice more stable and consistent.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSlider
                        name="settings.stability"
                        control={form.control}
                        min={0}
                        max={1}
                        step={0.05}
                        leftLabel="More Variable"
                        rightLabel="More Stable"
                        showValue
                        valueFormatter={value => `${Math.round(value * 100)}%`}
                        disabled={!hasApiKey(selectedProvider)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Similarity</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Enhances similarity to the original voice at the cost of some clarity.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSlider
                        name="settings.similarity"
                        control={form.control}
                        min={0}
                        max={1}
                        step={0.05}
                        leftLabel="Low"
                        rightLabel="High"
                        showValue
                        valueFormatter={value => `${Math.round(value * 100)}%`}
                        disabled={!hasApiKey(selectedProvider)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Style Exaggeration</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Controls how much the voice style is exaggerated.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSlider
                        name="settings.style"
                        control={form.control}
                        min={0}
                        max={1}
                        step={0.05}
                        leftLabel="None"
                        rightLabel="Exaggerated"
                        showValue
                        valueFormatter={value => `${Math.round(value * 100)}%`}
                        disabled={!hasApiKey(selectedProvider)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Speaker Boost</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Enhance speaker clarity and reduce background noise.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormCheckbox
                        name="settings.speaker_boost"
                        control={form.control}
                        label="Enable speaker boost"
                        description="Enhance speaker clarity and reduce background noise"
                        disabled={!hasApiKey(selectedProvider)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Settings — Gemini */}
            {selectedProvider === 'gemini' && (
              <div>
                <div className="px-4 mb-4">
                  <h3 className="text-base/7 font-semibold text-zinc-900">
                    Gemini Speech Settings
                  </h3>
                  <p className="mt-1 text-sm/6 text-zinc-600">
                    Configure the settings for Gemini speech generation.
                  </p>
                </div>
                {availableModels.length > 0 && (
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Model</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Choose the Gemini model for speech generation.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSelect
                        name="model_id"
                        control={form.control}
                        label="Model"
                        options={availableModels.map(model => ({ id: model.id, name: model.name }))}
                        disabled={!hasApiKey(selectedProvider)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Settings — Kokoro */}
            {selectedProvider === 'kokoro' && (
              <div>
                <div className="px-4 mb-4">
                  <h3 className="text-base/7 font-semibold text-zinc-900">Kokoro TTS Settings</h3>
                  <p className="mt-1 text-sm/6 text-zinc-600">
                    Configure the settings for Kokoro speech generation. Runs locally in your
                    browser.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Model</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Kokoro uses the Kokoro 82M v1.0 model.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-200">
                        <p className="text-sm font-medium text-zinc-900">Kokoro 82M v1.0</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          High-quality English TTS with 28 voices (US &amp; UK accents)
                        </p>
                        <p className="text-xs text-zinc-500 mt-2">
                          Model downloads on first use (~160MB). Runs locally via WebGPU.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Speed</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Controls how fast the voice speaks.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSlider
                        name="settings.speed"
                        control={form.control}
                        min={0.5}
                        max={2.0}
                        step={0.1}
                        leftLabel="Slower"
                        rightLabel="Faster"
                        showValue
                        valueFormatter={value => `${value}x`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3">
                    <div className="px-4 sm:px-0">
                      <h4 className="text-sm font-medium text-zinc-900">Language</h4>
                      <p className="mt-1 text-sm text-zinc-600">
                        Select the English variant for pronunciation.
                      </p>
                    </div>
                    <div className="md:col-span-2 px-4">
                      <FormSelect
                        name="settings.language"
                        control={form.control}
                        label="Language"
                        options={[
                          { id: 'en-us', name: 'English (US)' },
                          { id: 'en-gb', name: 'English (UK)' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!['browser', 'elevenlabs', 'gemini', 'kokoro'].includes(selectedProvider) && (
              <p className="px-4 text-sm text-muted-foreground">
                This provider has no adjustable speech settings.
              </p>
            )}
          </TabsContent>
        </Tabs>

        {/* Inline submit area */}
        <div className="border-t border-zinc-200 pt-4 space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-end gap-4">
            {success && (
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 animate-in fade-in slide-in-from-right-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Settings saved!</span>
              </div>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
