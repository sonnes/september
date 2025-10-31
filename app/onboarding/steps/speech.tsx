'use client';

import { useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { SpeechForm, SpeechFormSchema, type SpeechFormData } from '@/components/ai/settings/speech-form';

import { useOnboarding } from '../context';

/**
 * Speech Step Component
 *
 * Allows users to configure their text-to-speech provider and voice settings.
 * Users can skip this step if they want to set up later.
 */

export default function SpeechStep() {
  const { formData, updateSpeech, goNext, goBack, goSkip } = useOnboarding();

  // Initialize form with existing data from context
  const defaultValues = useMemo(() => {
    return formData.speech;
  }, [formData.speech]);

  const form = useForm<SpeechFormData>({
    resolver: zodResolver(SpeechFormSchema),
    defaultValues,
  });

  const handleSubmit = async (data: SpeechFormData) => {
    // Update context with speech data
    updateSpeech(data);
    // Navigate to next step
    goNext();
  };

  const handleSkip = () => {
    goSkip();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-3">
          Set Up Your Voice
        </h2>
        <p className="text-zinc-600 text-lg">
          Choose your text-to-speech provider and customize voice settings. You can skip this step and configure it later.
        </p>
      </div>

      {/* Speech Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <SpeechForm control={form.control} />

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-4 justify-between items-center pt-8 border-t border-zinc-200">
          <Button
            type="button"
            onClick={goBack}
            variant="outline"
            color="zinc"
            className="w-full sm:w-auto"
          >
            Back
          </Button>

          <div className="flex flex-col-reverse sm:flex-row gap-4 w-full sm:w-auto">
            <Button
              type="button"
              onClick={handleSkip}
              variant="outline"
              color="zinc"
              className="w-full sm:w-auto"
            >
              Skip for now
            </Button>

            <Button
              type="submit"
              className="w-full sm:w-auto"
            >
              Continue
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
