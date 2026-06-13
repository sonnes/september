'use client';

import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type Account, TranscriptionConfigSchema } from '@/packages/account';
import { Alert, AlertDescription, AlertTitle } from '@/packages/ui/components/alert';
import { Button } from '@/packages/ui/components/button';
import { FormCheckbox, FormSelect } from '@/packages/ui/components/form';
import { Spinner } from '@/packages/ui/components/spinner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { getModelsForProvider, getProvidersForFeature } from '../providers';

export type TranscriptionFormData = z.infer<typeof TranscriptionConfigSchema>;

interface TranscriptionFormProps {
  account?: Account;
  onSubmit: (data: TranscriptionFormData) => Promise<void>;
  children?: (props: {
    form: ReturnType<typeof useForm<TranscriptionFormData>>;
    error: string | null;
    success: boolean;
  }) => React.ReactNode;
}

export function TranscriptionForm({ account, onSubmit, children }: TranscriptionFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const defaultValues = useMemo((): TranscriptionFormData => {
    const config = account?.ai_transcription;
    return {
      enabled: config?.enabled ?? false,
      provider: (config?.provider as 'gemini' | 'openrouter') ?? 'gemini',
      model: config?.model ?? 'gemini-2.5-flash-lite',
      settings: {
        language: config?.settings?.language ?? 'en-US',
        detect_language: config?.settings?.detect_language ?? true,
        include_timestamps: config?.settings?.include_timestamps ?? false,
        filter_profanity: config?.settings?.filter_profanity ?? false,
      },
    };
  }, [account?.ai_transcription]);

  const form = useForm<TranscriptionFormData>({
    resolver: zodResolver(TranscriptionConfigSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const handleSubmit = async (data: TranscriptionFormData) => {
    setError(null);
    setSuccess(false);
    try {
      await onSubmit(data);
      setSuccess(true);
      toast.success('Settings Saved');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving transcription settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update transcription settings.');
    }
  };

  const provider = form.watch('provider');
  const transcriptionProviders = useMemo(
    () =>
      getProvidersForFeature('transcription')
        .filter(p => p.id === 'gemini' || p.id === 'openrouter')
        .map(p => ({ id: p.id, name: p.name })),
    []
  );
  const models = useMemo(() => getModelsForProvider(provider), [provider]);

  const formContent = (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold text-zinc-900">Enable Transcription</h3>
            <p className="text-sm text-zinc-500">Use AI to transcribe speech in real-time.</p>
          </div>
          <FormCheckbox name="enabled" control={form.control} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormSelect
            name="provider"
            control={form.control}
            label="Provider"
            description="Which AI provider transcribes your audio."
            options={transcriptionProviders}
          />

          <FormSelect
            name="model"
            control={form.control}
            label="AI Model"
            description="Select the model to use for transcription."
            options={models.map(m => ({ id: m.id, name: m.name }))}
          />

          <FormSelect
            name="settings.language"
            control={form.control}
            label="Primary Language"
            description="The main language spoken."
            options={[
              { id: 'en-US', name: 'English (US)' },
              { id: 'en-GB', name: 'English (UK)' },
              { id: 'es-ES', name: 'Spanish' },
              { id: 'fr-FR', name: 'French' },
              { id: 'de-DE', name: 'German' },
            ]}
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-zinc-900">Advanced Settings</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormCheckbox
              name="settings.detect_language"
              control={form.control}
              label="Auto-detect Language"
              description="Automatically detect the spoken language."
            />
            <FormCheckbox
              name="settings.include_timestamps"
              control={form.control}
              label="Include Timestamps"
              description="Add timestamps to the transcription."
            />
            <FormCheckbox
              name="settings.filter_profanity"
              control={form.control}
              label="Filter Profanity"
              description="Mask profanity in the transcription."
            />
          </div>
        </div>
      </div>

      {!children && (
        <div className="flex items-center justify-end gap-4 pt-4 border-t">
          {success && (
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Settings saved!</span>
            </div>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
            {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}
    </form>
  );

  return (
    <div className="space-y-6">
      {formContent}
      {children?.({ form, error, success })}
    </div>
  );
}
