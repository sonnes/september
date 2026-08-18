# @/packages/onboarding

Mode-centered onboarding wizard for September. The user picks a **setup mode**, and the mode determines the final step. Public exports below; everything else is internal.

The Tauri main window starts on `/desktop`. The desktop startup page sends incomplete accounts to `/onboarding` automatically. Returning accounts continue to their last safe app page.

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
- `SETUP_MODES` (+ `SetupMode`, `SetupModeAccent`, `SetupModeContent` types) — the shared copy for the available setup modes, reused by the marketing home "Setup choices" section and the Settings → Setup page so copy never drifts. Web builds include Privacy, Free AI, and Advanced. Desktop builds omit Privacy because browser-local models are unavailable.
- `inferSetupMode` — which mode an account is in: an explicit `account.setup_mode` wins, otherwise the configs are matched against what the builders produce (fallback `advanced`).
- `buildPrivacyModeUpdate` / `buildFreeModeUpdate` — account-update builders for the privacy and free modes, applied by the onboarding finish steps and the Settings → Setup mode cards.

### `OnboardingProvider`

Owns onboarding state: `currentStep`, the chosen `mode` (`'privacy' | 'free' | 'advanced' | null`) with `setMode`, step navigation (`goToNextStep`, `goToPreviousStep`, both clamped, plus `goToStep(n)` which only jumps back to an already-reached step), and `completeOnboarding` (saves `onboarding_completed: true` then redirects to `/spaces`). **Both `step` and `mode` are seeded from the URL** (`?step`, `?mode`) so the OpenRouter OAuth full-page redirect (`/onboarding?step=4&mode=free&code=…`) restores the right finish branch. The mode itself is **not** persisted to the account — it only drives which account fields the finish step writes.

### `OnboardingFlow`

Full-screen single-column flow: an **indigo hero header** (shared keycap mark and wordmark + setup title/description) over a white surface card. A **horizontal step indicator** sits at the top of the surface — completed steps show a check and are clickable to jump back; upcoming steps are inert. The four steps, in order:

1. **Welcome** — plain recommended path + example phrases.
2. **About you** — name (required), speaking-style persona chips + editable text, and an optional "personal words" collapsible (appended to `account.context` as bullet lines).
3. **Choose setup** — the centerpiece: selectable mode cards. Selecting one sets `mode`. The web build shows all three modes; the desktop build shows Free AI and Advanced.
4. **Finish** — branches on `mode`:
   - **Privacy** (`finish-privacy.tsx`) — summary; applies `buildPrivacyModeUpdate` (on-device Kokoro voice with `af_heart` default, suggestions preset to local WebLLM and transcription to local Whisper — both disabled, no provider keys) and kicks off `preloadKokoro()` so the one-time voice model download runs in the background.
   - **Free AI** (`finish-free.tsx`) — one-click **Connect OpenRouter** (OAuth); applies browser speech + OpenRouter suggestions. Finish is gated until connected, with a "use built-in instead" fallback that switches to Privacy.
   - **Advanced** (`finish-advanced.tsx`) — one combined screen: pick a voice service (+ key + voice) and a writing helper (+ key); applies `buildAdvancedFinishUpdate`.

Because it owns the full viewport, mount it on a route **outside** the sidebar shell — the `_onboarding` route group (supplies `ClientProviders` only).

## Internals (not exported)

- `useOnboarding` — context consumer hook used by all step components.
- `components/step-chrome.tsx` — `StepShell`, `StepHeader` (label → title → subtitle, optional back icon), `StepFooter` (helper + actions).
- `lib/onboarding-content.ts` — copy and step labels, shared with tests so primary language stays non-technical.
- `lib/setup-modes.ts` — `SETUP_MODES` copy plus the account-update builders `buildPrivacyModeUpdate`, `buildFreeModeUpdate`, and `buildAdvancedFinishUpdate` (+ `isSetupMode`, `inferSetupMode`).
- `lib/suggestions-setup.ts` — built-in vs OpenRouter suggestions update (reused by Privacy/Free/Advanced).
- `lib/provider-config.ts` — bridges the AI key form and the account `ai_providers` shape (`buildProviderConfig`, `getProviderDefaultValues`).
- `lib/voice-setup.ts` — small predicates for the Advanced voice picker.
