# @/packages/onboarding

Mode-centered onboarding wizard for September. The user picks a **setup mode**, and the mode determines the final step. Public exports below; everything else is internal.

## Public API

```tsx
import { OnboardingFlow, OnboardingProvider, SETUP_MODES } from '@/packages/onboarding';

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
```

- `OnboardingProvider` / `OnboardingFlow` — the wizard (see below).
- `SETUP_MODES` (+ `SetupMode`, `SetupModeAccent`, `SetupModeContent` types) — the shared copy for the three modes (Privacy / Free AI / Advanced), reused by the marketing home "Setup choices" section so copy never drifts.

### `OnboardingProvider`

Owns onboarding state: `currentStep`, the chosen `mode` (`'privacy' | 'free' | 'advanced' | null`) with `setMode`, step navigation (`goToNextStep`, `goToPreviousStep`, both clamped, plus `goToStep(n)` which only jumps back to an already-reached step), and `completeOnboarding` (saves `onboarding_completed: true` then redirects to `/talk`). **Both `step` and `mode` are seeded from the URL** (`?step`, `?mode`) so the OpenRouter OAuth full-page redirect (`/onboarding?step=4&mode=free&code=…`) restores the right finish branch. The mode itself is **not** persisted to the account — it only drives which account fields the finish step writes.

### `OnboardingFlow`

Full-screen single-column flow: an **indigo hero header** (brand + setup title/description) over a white surface card. A **horizontal step indicator** sits at the top of the surface — completed steps show a check and are clickable to jump back; upcoming steps are inert. The four steps, in order:

1. **Welcome** — plain recommended path + example phrases.
2. **About you** — name (required), speaking-style persona chips + editable text, and an optional "personal words" collapsible (appended to `account.context` as bullet lines).
3. **Choose setup** — the centerpiece: three selectable mode cards. Selecting one sets `mode`.
4. **Finish** — branches on `mode`:
   - **Privacy** (`finish-privacy.tsx`) — summary; applies `buildPrivacyModeUpdate` (browser speech, suggestions disabled, no provider keys).
   - **Free AI** (`finish-free.tsx`) — one-click **Connect OpenRouter** (OAuth); applies browser speech + OpenRouter suggestions. Finish is gated until connected, with a "use built-in instead" fallback that switches to Privacy.
   - **Advanced** (`finish-advanced.tsx`) — one combined screen: pick a voice service (+ key + voice) and a writing helper (+ key); applies `buildAdvancedFinishUpdate`.

Because it owns the full viewport, mount it on a route **outside** the sidebar shell — the `_onboarding` route group (supplies `ClientProviders` only).

## Internals (not exported)

- `useOnboarding` — context consumer hook used by all step components.
- `components/step-chrome.tsx` — `StepShell`, `StepHeader` (label → title → subtitle, optional back icon), `StepFooter` (helper + actions).
- `lib/onboarding-content.ts` — copy and step labels, shared with tests so primary language stays non-technical.
- `lib/setup-modes.ts` — `SETUP_MODES` copy plus the account-update builders `buildPrivacyModeUpdate` and `buildAdvancedFinishUpdate` (+ `isSetupMode`).
- `lib/suggestions-setup.ts` — built-in vs OpenRouter suggestions update (reused by Privacy/Free/Advanced).
- `lib/provider-config.ts` — bridges the AI key form and the account `ai_providers` shape (`buildProviderConfig`, `getProviderDefaultValues`).
- `lib/voice-setup.ts` — small predicates for the Advanced voice picker.
