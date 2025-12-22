'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CheckCircle2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { VoiceSettingsFormData, VoicesForm, VoicesList } from '@/packages/speech';
import { useAccount } from '@/packages/account';
import { useAISettings } from '@/packages/ai';

export default function VoicesSettingsForm() {
  const { account } = useAccount();
  const { updateSpeechConfig } = useAISettings();

  const handleSubmit = async (data: VoiceSettingsFormData) => {
    await updateSpeechConfig({
      provider: data.provider,
      voice_id: data.voice_id,
      voice_name: data.voice_name,
      model_id: data.model_id,
    });
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="mt-4 text-sm text-zinc-500">Loading voices...</p>
      </div>
    );
  }

  return (
    <VoicesForm account={account} onSubmit={handleSubmit}>
      {({
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
      }) => {
        const selectedVoiceId = form.watch('voice_id');
        const selectedModelId = form.watch('model_id');
        const allProviders = Object.values(availableProviders);

        const visibleProviders = allProviders.filter(provider => {
          if (!provider.requires_api_key) return true;
          return hasApiKey(provider.id);
        });

        return (
          <>
            <div className="space-y-6 pb-24">
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
                      onClick={() => onProviderChange(provider.id as any)}
                    >
                      <CardHeader className="p-4">
                        <CardTitle className="text-sm">{provider.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {provider.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>

                {visibleProviders.length < allProviders.length && (
                  <p className="text-xs text-muted-foreground">
                    Some providers are hidden because their API keys are not configured. Configure
                    API keys in{' '}
                    <a href="/settings/ai" className="text-primary hover:underline">
                      AI Providers settings
                    </a>
                    .
                  </p>
                )}
              </div>

              {/* Model Selection */}
              {availableModels.length > 0 && (
                <div className="space-y-3">
                  <Label htmlFor="model-select" className="text-sm font-medium text-zinc-900">
                    Model
                  </Label>
                  <Select value={selectedModelId} onValueChange={onModelChange}>
                    <SelectTrigger id="model-select" className="w-full">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex flex-col text-left">
                            <span>{model.name}</span>
                            {model.description && (
                              <span className="text-xs text-muted-foreground">
                                {model.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            </div>

            {/* Sticky Submit Button with status */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 md:left-[var(--sidebar-width)] z-10 shadow-lg">
              <div className="max-w-4xl mx-auto flex flex-col gap-4">
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
          </>
        );
      }}
    </VoicesForm>
  );
}
