'use client';

import { FormEvent, useEffect, useState } from 'react';

import { useAccount } from '@/packages/account';
import { Button } from '@/packages/ui/components/button';
import { Input } from '@/packages/ui/components/input';
import { Label } from '@/packages/ui/components/label';
import { Textarea } from '@/packages/ui/components/textarea';
import { Sparkles, UserRound } from 'lucide-react';

import { DEFAULT_SPEAKING_STYLE, ONBOARDING_PRIMARY_COPY } from '../../lib/onboarding-content';
import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

export function ProfileStep() {
  const { goToNextStep, goToPreviousStep } = useOnboarding();
  const { account, updateAccount } = useAccount();
  const copy = ONBOARDING_PRIMARY_COPY.profile;
  const [name, setName] = useState(account?.name ?? '');
  const [persona, setPersona] = useState(
    account?.ai_suggestions?.settings?.system_instructions ?? DEFAULT_SPEAKING_STYLE
  );
  const [isSaving, setIsSaving] = useState(false);
  const selectedPersona = copy.personas.find(option => option.value === persona);

  useEffect(() => {
    if (!account) return;
    setName(account.name);
    setPersona(account.ai_suggestions?.settings?.system_instructions ?? DEFAULT_SPEAKING_STYLE);
  }, [account]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      setIsSaving(true);
      await updateAccount({
        name: trimmedName,
        ai_suggestions: {
          enabled: account?.ai_suggestions?.enabled ?? false,
          provider: account?.ai_suggestions?.provider ?? 'gemini',
          model: account?.ai_suggestions?.model ?? 'gemini-2.5-flash-lite',
          settings: {
            ...(account?.ai_suggestions?.settings ?? {}),
            system_instructions: persona.trim(),
          },
        },
      });
      goToNextStep();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepShell>
        <StepHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={copy.subtitle}
          onBack={goToPreviousStep}
        />

        <div className="space-y-6">
          <div className="grid gap-5 border-l border-border pl-5 md:grid-cols-[15rem_1fr] md:gap-8">
            <div>
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Name</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Used in September's local profile.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding-name">Name</Label>
              <Input
                id="onboarding-name"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-5 border-l border-border pl-5 md:grid-cols-[15rem_1fr] md:gap-8">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Speaking style</h2>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                A short note helps September learn how you talk.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Start with a style</p>
                <div className="flex flex-wrap gap-2">
                  {copy.personas.map(option => {
                    const isSelected = persona === option.value;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={isSelected}
                        className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30'
                        }`}
                        onClick={() => setPersona(option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {selectedPersona?.description ?? 'Edit the note below any time.'}
                </p>
              </div>

              <Label htmlFor="onboarding-persona">How should September sound?</Label>
              <Textarea
                id="onboarding-persona"
                value={persona}
                onChange={event => setPersona(event.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Plain, warm, and direct. Use everyday language."
                className="min-h-32"
              />
            </div>
          </div>
        </div>

        <StepFooter helper={copy.helper}>
          <Button type="submit" size="lg" disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving...' : copy.primaryAction}
          </Button>
        </StepFooter>
      </StepShell>
    </form>
  );
}
