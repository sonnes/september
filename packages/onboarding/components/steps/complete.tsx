'use client';

import { useState } from 'react';

import { Key, MessageSquare, Volume2 } from 'lucide-react';

import { Button } from '@september/ui/components/button';
import { Callout } from '@september/ui/components/callout';
import { Card, CardContent } from '@september/ui/components/card';

import { useAccount } from '@september/account';
import { useAISettings } from '@september/ai';

import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

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
          status === 'configured' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          {status === 'configured' ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
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
  const { account } = useAccount();
  const { suggestionsConfig, speechConfig } = useAISettings();
  const [isCompleting, setIsCompleting] = useState(false);

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
      // completeOnboarding persists the flag and redirects to /talk
      await completeOnboarding();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setIsCompleting(false);
    }
  };

  return (
    <StepShell>
      <StepHeader
        eyebrow="All set"
        title="You're all set"
        subtitle="September is configured and ready to help you communicate. Here's a summary of your setup."
        onBack={goToPreviousStep}
      />

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

      <Callout tone="info">
        <strong>Tip:</strong> You can always change these settings later from the Settings page.
      </Callout>

      <StepFooter helper="Everything here can be changed later in Settings.">
        <Button size="lg" onClick={handleComplete} disabled={isCompleting}>
          {isCompleting ? 'Starting...' : 'Start Talking'}
        </Button>
      </StepFooter>
    </StepShell>
  );
}
