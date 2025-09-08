'use client';

import { FormTextarea } from '@/components/ui/form';

import { SectionProps } from './types';

const EXAMPLE_INSTRUCTIONS = [
  {
    name: 'ALS Person',
    text: 'I am a person living with ALS. I cannot move speak.I also work as a software engineer. You should help me with communication. I usually talk about my daily chores, talking to my family, communication during work meetings, etc.',
  },
  {
    name: 'Yoda',
    text: "I'm a wise and knowledgeable Jedi Master who talks like Yoda in Star Wars.",
  },
  {
    name: 'Teenager',
    text: 'I am a Gen Z teenager. You need to use modern slang and emojis. You should also be able to talk about the latest trends in technology, music, and fashion.',
  },
];

export function InstructionsSection({ control, setValue }: SectionProps) {
  const handleExampleClick = (example: string) => {
    setValue('ai_instructions', example);
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 py-4 md:grid-cols-3">
      <div className="px-4 sm:px-0">
        <h2 className="text-base/7 font-semibold text-gray-900">Your Instructions</h2>
        <p className="mt-1 text-sm/6 text-gray-600">
          Describe how you want the AI to provide suggestions. Include common phrases, topics, names
          of people, places, etc. This will help the AI to provide more relevant suggestions.
        </p>
      </div>

      <div className="md:col-span-2 px-4">
        <div className="max-w-2xl space-y-4">
          <div>
            <FormTextarea
              name="ai_instructions"
              control={control}
              placeholder="Describe how you want the AI to provide suggestions..."
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <button
              type="button"
              onClick={() => {
                const currentShow = document.getElementById('examples')?.style.display === 'none';
                const examplesEl = document.getElementById('examples');
                if (examplesEl) {
                  examplesEl.style.display = currentShow ? 'block' : 'none';
                }
              }}
              className="flex w-full items-center justify-between text-left"
            >
              <h4 className="text-sm font-medium text-gray-700">Example Instructions</h4>
              <svg
                className="h-4 w-4 text-gray-500 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <div id="examples" className="mt-3 space-y-2" style={{ display: 'none' }}>
              {EXAMPLE_INSTRUCTIONS.map(example => (
                <button
                  key={example.name}
                  type="button"
                  onClick={() => handleExampleClick(example.text)}
                  className="block w-full text-left rounded border border-gray-200 bg-white p-3 text-sm hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900 text-sm">{example.name}</div>
                  <div className="mt-1 text-gray-600 text-sm leading-relaxed">{example.text}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
