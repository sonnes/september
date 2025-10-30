'use client';

import Link from 'next/link';
import {
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

/**
 * Completion Step Component
 *
 * This is the final screen shown after completing all onboarding steps.
 *
 * Purpose: Celebrate completion and guide user to start using the app.
 */

interface ConfigSummary {
  hasApiKeys?: boolean;
  voiceName?: string;
  suggestionsEnabled?: boolean;
}

interface CompleteStepProps {
  onComplete: () => void;
  configSummary?: ConfigSummary;
}

export default function CompleteStep({ onComplete, configSummary }: CompleteStepProps) {
  const nextSteps = [
    {
      title: 'Start Talking',
      description: 'Go to the main communication interface and start using September',
      icon: ChatBubbleLeftRightIcon,
      href: '/talk',
      primary: true,
    },
    {
      title: 'Browse Voices',
      description: 'Explore more voice options and find the perfect one for you',
      icon: SpeakerWaveIcon,
      href: '/voices',
      primary: false,
    },
    {
      title: 'Customize Settings',
      description: 'Fine-tune your configuration and explore advanced features',
      icon: Cog6ToothIcon,
      href: '/settings',
      primary: false,
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-green-600 rounded-full blur-xl opacity-50 animate-pulse" />
          <CheckCircleIcon className="relative w-24 h-24 text-green-500" />
        </div>
      </div>

      {/* Heading */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">You&apos;re All Set!</h1>
        <p className="text-xl text-zinc-300">September is ready to help you communicate</p>
      </div>

      {/* Configuration Summary Card */}
      {configSummary && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Configuration Summary</h2>
          <div className="space-y-3">
            {/* API Keys */}
            {configSummary.hasApiKeys && (
              <div className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">API Keys Configured</p>
                  <p className="text-xs text-zinc-400">
                    Your AI providers are ready to use
                  </p>
                </div>
              </div>
            )}

            {/* Voice Selection */}
            {configSummary.voiceName && (
              <div className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Voice Selected</p>
                  <p className="text-xs text-zinc-400">{configSummary.voiceName}</p>
                </div>
              </div>
            )}

            {/* AI Suggestions */}
            {configSummary.suggestionsEnabled !== undefined && (
              <div className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    AI Suggestions {configSummary.suggestionsEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {configSummary.suggestionsEnabled
                      ? 'Get smart suggestions while you type'
                      : 'You can enable this later in settings'}
                  </p>
                </div>
              </div>
            )}

            {/* Fallback if no summary provided */}
            {!configSummary.hasApiKeys &&
              !configSummary.voiceName &&
              configSummary.suggestionsEnabled === undefined && (
                <div className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">Setup Complete</p>
                    <p className="text-xs text-zinc-400">
                      You can customize your settings anytime
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Next Steps Section */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-white mb-4 text-center">Next Steps</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nextSteps.map((step) => {
            const IconComponent = step.icon;
            return (
              <Link
                key={step.title}
                href={step.href}
                className={`
                  bg-zinc-800 border border-zinc-700 rounded-lg p-5
                  hover:border-zinc-600 hover:shadow-lg transition-all
                  flex flex-col items-center text-center
                  ${step.primary ? 'md:col-span-3 ring-2 ring-indigo-600' : ''}
                `}
              >
                <div className={`p-3 rounded-lg mb-3 ${step.primary ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-zinc-400">{step.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Primary CTA */}
      <div className="flex flex-col items-center gap-3">
        <Button onClick={onComplete} color="indigo" size="lg" className="w-full md:w-auto md:min-w-[300px]">
          Start Talking
        </Button>
        <Link
          href="/settings"
          className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
        >
          Customize Settings
        </Link>
      </div>
    </div>
  );
}
