# @september/onboarding

Multi-step onboarding wizard for September. Two public exports; everything else is internal.

## Public API

```tsx
import { OnboardingProvider, OnboardingFlow } from '@september/onboarding';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
```

### `OnboardingProvider`

Owns all onboarding state: current step index, step navigation (`goToNextStep`, `goToPreviousStep`, both clamped), and `completeOnboarding` (saves `onboarding_completed: true` to the account then redirects to `/talk`). Must wrap `OnboardingFlow`.

### `OnboardingFlow`

Renders a progress bar and the appropriate step component based on the current step. The five steps are — in order — Welcome, AI Providers, Suggestions, Speech, and Complete.

## Internals (not exported)

- `useOnboarding` — context consumer hook used by all step components; not in the public barrel.
- `components/steps/` — bespoke step components; each calls `useOnboarding` directly.
