'use client';

import { useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  BrowserTTSSettingsSection,
  CorpusSection,
  ElevenLabsSettingsSection,
  GeminiAPIKeySection,
  InstructionsSection,
  SectionProps,
  SettingsFormData,
  SettingsSchema,
  SpeechProviderSection,
} from '@/components/settings';
import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';

import { useAccount } from '@/services/account';

export default function SettingsForm() {
  const { account, updateAccount } = useAccount();
  const { show, showError } = useToast();

  const defaultValues = useMemo(() => {
    return {
      speech_provider: account?.speech_provider || 'browser_tts',
      speech_settings: {
        api_key: account?.speech_settings?.api_key || '',
        model_id: account?.speech_settings?.model_id || '',
        speed: account?.speech_settings?.speed || 1.0,
        stability: account?.speech_settings?.stability || 0.5,
        similarity: account?.speech_settings?.similarity || 0.5,
        style: account?.speech_settings?.style || 0.5,
        speaker_boost: account?.speech_settings?.speaker_boost || false,
        pitch: account?.speech_settings?.pitch || 0,
        volume: account?.speech_settings?.volume || 1.0,
      },
      gemini_api_key: account?.gemini_api_key || '',
      ai_instructions: account?.ai_instructions || '',
      ai_corpus: account?.ai_corpus || '',
    };
  }, [account]);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await updateAccount({
        speech_provider: data.speech_provider,
        speech_settings: data.speech_settings,
        gemini_api_key: data.gemini_api_key,
        ai_instructions: data.ai_instructions,
        ai_corpus: data.ai_corpus,
      });
      show({
        title: 'Settings',
        message: 'Your settings have been updated successfully.',
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      showError('Failed to update settings. Please try again.');
    }
  };

  const speechProvider = form.watch('speech_provider');

  if (!account) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-zinc-500">Loading account settings...</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-400">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <GeminiAPIKeySection control={form.control} watch={form.watch} setValue={form.setValue} />
        <InstructionsSection control={form.control} watch={form.watch} setValue={form.setValue} />
        <CorpusSection control={form.control} watch={form.watch} setValue={form.setValue} />
        <SpeechProviderSection control={form.control} watch={form.watch} setValue={form.setValue} />
        {speechProvider === 'elevenlabs' && (
          <ElevenLabsSettingsSection
            control={form.control}
            watch={form.watch}
            setValue={form.setValue}
          />
        )}
        {speechProvider === 'browser_tts' && (
          <BrowserTTSSettingsSection
            control={form.control}
            watch={form.watch}
            setValue={form.setValue}
          />
        )}
        {/* Floating save button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
