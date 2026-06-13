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

Owns all onboarding state: current step index, step navigation (`goToNextStep`, `goToPreviousStep`, both clamped, plus `goToStep(n)` which only jumps back to an already-reached step), and `completeOnboarding` (saves `onboarding_completed: true` to the account then redirects to `/talk`). Must wrap `OnboardingFlow`.

### `OnboardingFlow`

Renders a **full-screen** flow (centered `max-w-2xl` column over a subtle radial indigo glow — no sidebar) with a clickable step-circle progress indicator and the current step component. Completed circles are clickable to jump back; upcoming circles are inert. The five steps are — in order — Welcome, AI Providers, Suggestions, Speech, and Complete.

Because it owns the full viewport, mount it on a route **outside** the sidebar shell. In the web app it lives in the `app/(onboarding)/` route group (a layout that supplies `ClientProviders` only), not `(app)/`.

## Internals (not exported)

- `useOnboarding` — context consumer hook used by all step components; not in the public barrel.
- `components/step-chrome.tsx` — shared step chrome for the setup flow: `StepShell`, `StepHeader` (eyebrow → 36px hero title → subtitle, optional back icon), and `StepFooter` (helper text + actions). Step bodies favor compact, border-only setup panels. Every step composes these.
- `components/steps/` — bespoke step components; each calls `useOnboarding` directly and wraps its body in `StepShell`. The AI providers step shows only key-backed external providers; browser/local defaults are implicit.
