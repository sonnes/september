# @/packages/onboarding

Multi-step onboarding wizard for September. Two public exports; everything else is internal.

## Public API

```tsx
import { OnboardingFlow, OnboardingProvider } from '@/packages/onboarding';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
```

### `OnboardingProvider`

Owns all onboarding state: current step index, step navigation (`goToNextStep`, `goToPreviousStep`, both clamped, plus `goToStep(n)` which only jumps back to an already-reached step), and `completeOnboarding` (saves `onboarding_completed: true` to the account then redirects to `/talk`). Must wrap `OnboardingFlow`.

### `OnboardingFlow`

Renders a **full-screen** flow with a solid indigo setup panel on the left and a calm setup surface on the right. Completed steps are clickable to jump back; upcoming steps are inert. The setup surface uses plain guidance and explicit selection rows instead of card tiles, so passive information does not look like a button. The four steps are — in order — Welcome, You, Voice, and Suggestions.

Because it owns the full viewport, mount it on a route **outside** the sidebar shell. In the web app it lives in the `app/(onboarding)/` route group (a layout that supplies `ClientProviders` only), not `(app)/`.

## Internals (not exported)

- `useOnboarding` — context consumer hook used by all step components; not in the public barrel.
- `components/step-chrome.tsx` — shared step chrome for the setup flow: `StepShell`, `StepHeader` (step label → page title → subtitle, optional back icon), and `StepFooter` (helper text + actions). Every step composes these inside the side-panel shell.
- `components/steps/` — bespoke step components; each calls `useOnboarding` directly and wraps its body in `StepShell`. The Welcome step uses a plain recommended path and static example phrases. The You step includes editable speaking-style text plus default persona chips. The Voice step starts with the built-in voice, uses a compact picker that describes only the selected option, and shows extra service connection details whenever the user chooses one. The Suggestions step finishes onboarding, keeps built-in suggestions as the default path, and lets users optionally connect OpenRouter or add personal words.
- `lib/onboarding-content.ts` — internal copy and step labels shared by the flow and tests so primary onboarding language stays non-technical.
- `lib/suggestions-setup.ts` — internal helper for building the Suggestions step account update before completing onboarding.
