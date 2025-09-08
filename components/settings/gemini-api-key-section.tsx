'use client';

import { FormInput } from '@/components/ui/form';

import { SectionProps } from './types';

export function GeminiAPIKeySection({ control }: SectionProps) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Gemini API Key</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Enter your Google Gemini API key to enable AI-powered suggestions. You can get your API
          key from the{' '}
          <a
            href="https://makersuite.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-500 underline"
          >
            Google AI Studio
          </a>
          .
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div>
            <FormInput
              name="gemini_api_key"
              control={control}
              type="password"
              placeholder="Enter your Gemini API key"
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
