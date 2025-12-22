# Onboarding Module

This module handles the user onboarding flow for September.

## Features

- Multi-step onboarding process
- AI provider configuration
- Suggestion settings
- Voice selection
- Progress tracking

## Components

- `OnboardingFlow`: The main component that renders the onboarding steps.
- `OnboardingStep`: A wrapper component for individual onboarding steps.
- `steps/`: Individual step components (Welcome, AI Providers, Suggestions, Speech, Complete).

## Context & Hooks

- `OnboardingProvider`: Manages the state of the onboarding process (current step, navigation).
- `useOnboarding`: Hook to access the onboarding state and navigation functions.

## Usage

```tsx
import { OnboardingProvider, OnboardingFlow } from '@/packages/onboarding';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
```

