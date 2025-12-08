'use client';

import { ArrowRight, Key, MessageSquare, Settings, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { useOnboarding } from '../context';

const SETUP_STEPS = [
  {
    icon: Key,
    title: 'API Keys',
    description: 'Connect AI providers for suggestions and voice synthesis',
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

export function WelcomeStep() {
  const { goToNextStep } = useOnboarding();

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-8">
        <h1 className="text-3xl text-indigo-600 font-bold tracking-tight mb-4">
          Welcome to September
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          September is an assistive communication app that helps you express yourself with
          AI-powered suggestions and natural voice synthesis.
        </p>
      </div>

      <Card className="w-full max-w-2xl mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 text-left">What we&apos;ll set up:</h2>
          <div className="grid gap-4">
            {SETUP_STEPS.map((step, index) => (
              <div key={index} className="flex items-start gap-4 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button size="lg" onClick={goToNextStep}>
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
