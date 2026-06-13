'use client';

import { MessageSquare, Settings, Sparkles, Volume2 } from 'lucide-react';

import { Button } from '@september/ui/components/button';

import { useOnboarding } from '../onboarding-provider';
import { StepFooter, StepHeader, StepShell } from '../step-chrome';

const SETUP_STEPS = [
  {
    icon: Sparkles,
    title: 'AI Providers',
    description: 'Configure AI providers for suggestions and voice synthesis',
  },
  {
    icon: MessageSquare,
    title: 'AI Suggestions',
    description: 'Configure intelligent typing predictions',
  },
  {
    icon: Volume2,
    title: 'Voice Settings',
    description: 'Choose your preferred speech voice',
  },
  {
    icon: Settings,
    title: 'Complete Setup',
    description: 'Review and finish your configuration',
  },
];

const EXAMPLES = [
  "I'd like a sip of water, please.",
  'Give me a moment to finish my thought.',
  "It's good to see you.",
  'Can you turn the light down a little?',
];

export function WelcomeStep() {
  const { goToNextStep } = useOnboarding();

  return (
    <StepShell>
      <StepHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>September</span>
          </span>
        }
        title="Let's set you up"
        subtitle="September turns a few keystrokes into full sentences and speaks them aloud. Here's the kind of thing it helps you say:"
      />

      <div className="flex flex-col gap-2 rounded-sm border bg-muted/30 px-4 py-3">
        {EXAMPLES.map(example => (
          <div key={example} className="flex items-center gap-3">
            <span className="shrink-0 text-base font-bold text-primary">*</span>
            <span className="text-sm text-foreground">“{example}”</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {SETUP_STEPS.map(step => (
          <div key={step.title} className="flex gap-4">
            <step.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <StepFooter helper="A few quick steps, then you're talking.">
        <Button size="lg" onClick={goToNextStep}>
          Get Started
        </Button>
      </StepFooter>
    </StepShell>
  );
}
