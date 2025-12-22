'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { CheckCircle2, Key, MessageSquare, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { useAccountContext } from '@/packages/account';
import { useAISettings } from '@/packages/ai';

import { useOnboarding } from '@/packages/onboarding/components/onboarding-provider';

interface SummaryItemProps {
  icon: React.ReactNode;
  title: string;
  status: 'configured' | 'skipped';
  details?: string;
}

function SummaryItem({ icon, title, status, details }: SummaryItemProps) {
  return (
    <div className="flex items-start gap-4 py-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          status === 'configured' ? 'bg-green-100 text-green-600' : 'bg-zinc-100 text-zinc-400'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          {status === 'configured' ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Configured
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
              Skipped
            </span>
          )}
        </div>
        {details && <p className="mt-1 text-sm text-muted-foreground">{details}</p>}
      </div>
    </div>
  );
}

export function CompleteStep() {
  const { completeOnboarding, goToPreviousStep } = useOnboarding();
  const { account } = useAccountContext();
  const { suggestionsConfig, speechConfig } = useAISettings();
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  // Determine API keys status
  const configuredProviders: string[] = [];
  if (account?.ai_providers?.gemini?.api_key) configuredProviders.push('Google Gemini');
  if (account?.ai_providers?.elevenlabs?.api_key) configuredProviders.push('ElevenLabs');

  const hasApiKeys = configuredProviders.length > 0;
  const apiKeysDetails = hasApiKeys
    ? `${configuredProviders.join(', ')}`
    : 'No API keys configured. Using browser defaults.';

  // Determine suggestions status
  const suggestionsEnabled = suggestionsConfig.enabled;
  const suggestionsDetails = suggestionsEnabled
    ? `Enabled with ${suggestionsConfig.model || 'Gemini'}`
    : 'AI suggestions are disabled';

  // Determine voice status
  const hasVoice = !!speechConfig.voice_id;
  const voiceDetails = hasVoice
    ? `${speechConfig.voice_name} (${speechConfig.provider})`
    : `Using ${speechConfig.provider} default voice`;

  const handleComplete = async () => {
    try {
      setIsCompleting(true);
      await completeOnboarding();
      router.push('/talk');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setIsCompleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Success Header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">You&apos;re All Set!</h2>
        <p className="mt-2 text-muted-foreground">
          September is configured and ready to help you communicate. Here&apos;s a summary of your
          setup.
        </p>
      </div>

      {/* Configuration Summary */}
      <Card>
        <CardContent className="divide-y pt-2">
          <SummaryItem
            icon={<Key className="h-5 w-5" />}
            title="API Keys"
            status={hasApiKeys ? 'configured' : 'skipped'}
            details={apiKeysDetails}
          />
          <SummaryItem
            icon={<MessageSquare className="h-5 w-5" />}
            title="AI Suggestions"
            status={suggestionsEnabled ? 'configured' : 'skipped'}
            details={suggestionsDetails}
          />
          <SummaryItem
            icon={<Volume2 className="h-5 w-5" />}
            title="Voice Settings"
            status={hasVoice ? 'configured' : 'skipped'}
            details={voiceDetails}
          />
        </CardContent>
      </Card>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> You can always change these settings later from the Settings page.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="ghost" onClick={goToPreviousStep}>
          Back
        </Button>
        <Button size="lg" onClick={handleComplete} disabled={isCompleting}>
          {isCompleting ? 'Starting...' : 'Start Talking'}
        </Button>
      </div>
    </div>
  );
}

