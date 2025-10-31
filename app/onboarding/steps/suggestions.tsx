'use client';

import { useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { SuggestionsForm, SuggestionsFormSchema, type SuggestionsFormData } from '@/components/ai/settings/suggestions-form';

import { useOnboarding } from '../context';

/**
 * Suggestions Step Component
 *
 * Allows users to configure AI suggestions settings including:
 * - Enable/disable toggle
 * - Model selection
 * - System instructions
 * - AI corpus
 * - Advanced settings (temperature, max_suggestions, context_window)
 *
 * Users can skip this step if they want to set up later.
 */

export default function SuggestionsStep() {
  const { formData, updateSuggestions, goNext, goBack, goSkip } = useOnboarding();

  // Initialize form with existing data from context
  const defaultValues = useMemo(() => {
    return formData.suggestions;
  }, [formData.suggestions]);

  const form = useForm<SuggestionsFormData>({
    resolver: zodResolver(SuggestionsFormSchema),
    defaultValues,
  });

  const handleSubmit = async (data: SuggestionsFormData) => {
    // Update context with suggestions data
    updateSuggestions(data);
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
          Personalize Your AI Assistant
        </h2>
        <p className="text-zinc-600 text-lg">
          Configure AI-powered typing suggestions to help you communicate faster. You can skip this step and configure it later.
        </p>
      </div>

      {/* Suggestions Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <SuggestionsForm
          control={form.control}
          setValue={form.setValue}
          watch={form.watch}
        />

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
              Complete Setup
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
