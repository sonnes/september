'use client';

import { useState } from 'react';

import { CheckCircle2 } from 'lucide-react';

import { useAccount } from '@/packages/account';
import { Button } from '@/packages/ui/components/button';

import { ONBOARDING_PRIMARY_COPY } from '../../lib/onboarding-content';
import { buildPrivacyModeUpdate } from '../../lib/setup-modes';
import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

export function PrivacyFinishStep() {
  const { completeOnboarding, goToPreviousStep } = useOnboarding();
  const { account, updateAccount } = useAccount();
  const copy = ONBOARDING_PRIMARY_COPY.finish.privacy;
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      await updateAccount(
        buildPrivacyModeUpdate({
          currentSpeech: account?.ai_speech,
          currentSuggestions: account?.ai_suggestions,
          currentProviders: account?.ai_providers,
        })
      );
      await completeOnboarding();
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <StepShell>
      <StepHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        subtitle={copy.subtitle}
        onBack={goToPreviousStep}
      />

      <ul className="grid gap-4 border-l border-border pl-5">
        {copy.summary.map(item => (
          <li key={item} className="flex items-center gap-3 text-sm">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <StepFooter helper={copy.helper}>
        <Button size="lg" onClick={handleSubmit} disabled={isSaving || !account}>
          {isSaving ? 'Saving...' : copy.primaryAction}
        </Button>
      </StepFooter>
    </StepShell>
  );
}
