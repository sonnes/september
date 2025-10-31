'use client';

import { MicrophoneIcon, SparklesIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/ui/button';

import { useOnboarding } from '../context';

/**
 * Welcome Step Component
 *
 * This is the initial welcome screen for the onboarding wizard.
 *
 * Purpose: Orient the user, explain what they'll accomplish, and introduce
 * AI providers with their capabilities.
 */

export default function WelcomeStep() {
  const { goNext, goSkip } = useOnboarding();
  const providerCards = [
    {
      name: 'Google Gemini',
      icon: SparklesIcon,
      features: [
        {
          icon: SparklesIcon,
          title: 'AI Suggestions',
          description: 'Smart typing completions\nContext-aware responses',
        },
        {
          icon: MicrophoneIcon,
          title: 'Speech-to-Text',
          description: 'Real-time transcription\nVoice recognition',
        },
        { icon: SpeakerWaveIcon, title: 'Text-to-Speech', description: 'Natural voice synthesis' },
      ],
      apiKeyLink: 'https://aistudio.google.com/app/apikey',
      requiresKey: true,
      status: 'Not configured',
    },
    {
      name: 'ElevenLabs',
      icon: SpeakerWaveIcon,
      features: [
        {
          icon: SpeakerWaveIcon,
          title: 'Premium Text-to-Speech',
          description:
            'High-quality voices\nVoice cloning\nMultiple languages\nNatural-sounding speech',
        },
      ],
      apiKeyLink: 'https://elevenlabs.io/app/settings/api-keys',
      requiresKey: true,
      status: 'Not configured',
    },
    {
      name: 'Browser Speech',
      icon: SpeakerWaveIcon,
      features: [
        {
          icon: SpeakerWaveIcon,
          title: 'Basic Text-to-Speech',
          description: 'Built into your browser\nNo setup needed\nFree to use\nWorks offline',
        },
      ],
      requiresKey: false,
      status: 'Always available',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* AI Provider Overview Section */}
      <div className="mb-10">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-700 mb-2 text-center">
          Choose Your AI Providers
        </h2>
        <p className="text-zinc-600 text-center mb-8">
          September works with leading AI providers to give you the best experience. Get your API
          keys to unlock these features:
        </p>

        {/* Provider Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {providerCards.map(provider => {
            const IconComponent = provider.icon;
            return (
              <div
                key={provider.name}
                className="bg-white border border-zinc-200 rounded-lg p-6 hover:shadow-lg hover:border-zinc-300 transition-all"
              >
                {/* Provider Icon and Name */}
                <div className="flex items-center mb-4">
                  <div className="bg-indigo-600 p-2 rounded-lg mr-3">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">{provider.name}</h3>
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-6">
                  {provider.features.map((feature, idx) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <div key={idx} className="flex items-start">
                        <FeatureIcon className="w-5 h-5 text-zinc-600 mr-2 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-zinc-800">{feature.title}</p>
                          <p className="text-xs text-zinc-600 whitespace-pre-line">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* CTA Button or Badge */}
                {provider.requiresKey ? (
                  <a
                    href={provider.apiKeyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <Button className="w-full" color="indigo" size="md">
                      Get API Key →
                    </Button>
                  </a>
                ) : (
                  <div className="w-full text-center py-2 px-4 bg-green-50 border border-green-600 rounded-md">
                    <span className="text-sm font-semibold text-green-700">
                      No API Key Needed ✓
                    </span>
                  </div>
                )}

                {/* Status Indicator */}
                <div className="mt-4 pt-4 border-t border-zinc-200">
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium">Status:</span> {provider.status}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={goNext}
          color="indigo"
          size="lg"
          className="w-full md:w-auto md:min-w-[300px]"
        >
          Continue to Setup
        </Button>
        <button
          onClick={goSkip}
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          I&apos;ll set this up later
        </button>
      </div>
    </div>
  );
}
