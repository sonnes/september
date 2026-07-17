# Settings redesign — mode-first hierarchy

Date: 2026-07-13
Status: approved (mock iterated with user; this documents the implementation)
Mock: claude.ai artifact "September — Settings redesign mock" (sidebar-layout version)

## Problem

Current settings expose system vocabulary (Providers, Suggestions, Transcription)
in a flat 5-section nav. Users must understand the provider→feature wiring before
anything works; the mode concept from onboarding vanishes after setup; feature
pages show "API key required" callouts instead of preventing the broken state
upstream.

## Design (from the approved mock)

One root decision — *how September runs* — then everything follows:

1. **Setup** (`/settings`, new landing page)
   - Three mode cards (reusing onboarding's `SETUP_MODES`: privacy / free /
     advanced). Selecting a mode applies its config update immediately and
     persists the choice.
   - **Connections** section below, filtered by mode:
     - privacy → "Nothing to connect" callout + on-device model rows (words,
       not status dots)
     - free → OpenRouter row with one-click Connect (OAuth) + browser voice row
     - advanced → provider rows (ElevenLabs, Gemini, OpenRouter) with
       word-based state and a single state-matched action (Set up › / Manage ›)
2. **Feature pages** — user vocabulary: Voice (`/settings/voice`), Writing help
   (`/settings/writing`), Listening (`/settings/listening`). Reuse the existing
   form components; callouts point to Setup.
3. **Account** (`/settings/account`) — moved from first to last: personal info,
   sync, export/import.
4. **Provider detail drill-ins** (`/settings/connections/$provider`) — Zed-style:
   plain-language description, numbered get-key steps embedded in the page, key
   field, save. OpenRouter gets one-click OAuth Connect with a manual-key
   fallback.

Zed-inspired rules applied throughout: state in words not color dots; one
state-specific action per row; setup instructions live inside settings; quiet
divider lists instead of cards.

## Data model

- Add optional `setup_mode: 'privacy' | 'free' | 'advanced'` to `AccountSchema`.
  Explicit user choice; for existing accounts, fall back to inference.
- New pure functions in `onboarding/lib/setup-modes.ts` (settings imports them;
  copy + builders stay single-sourced):
  - `inferSetupMode(account)` — privacy when speech=kokoro + suggestions=webllm
    + transcription=whisper; free when suggestions=openrouter + speech=browser;
    otherwise advanced.
  - `buildFreeModeUpdate(...)` — browser speech enabled + OpenRouter suggestions
    (enabled only when a key is present), mirroring onboarding's free finish
    step.

## Routes

| Old | New |
|---|---|
| `/settings` (Account) | `/settings` = Setup (mode + connections) |
| `/settings/providers` | redirect → `/settings` (preserves OAuth `?code`) |
| `/settings/speech` | `/settings/voice` (redirect kept) |
| `/settings/suggestions` | `/settings/writing` (redirect kept) |
| `/settings/transcription` | `/settings/listening` (redirect kept) |
| — | `/settings/account` (old Account page) |
| — | `/settings/connections/$provider` (gemini, elevenlabs, openrouter) |

OpenRouter OAuth `code` handling moves from the providers form to the Setup
page; old callback URLs keep working via the redirect.

## Out of scope (follow-ups)

- Rebuilding the feature forms to the mock's via-chip + disclosure pattern
  (v1 reuses `SpeechSettings`, `SuggestionsForm`, `TranscriptionForm` as-is).
- Live download states for on-device models on the Setup page.
- "Edit as JSON" backup escape hatch.
- Theme toggle.

## Verification

- Vitest: schema accepts `setup_mode`; `inferSetupMode` and
  `buildFreeModeUpdate` covered; SettingsNav sections asserted.
- `pnpm lint`, `pnpm test`, `pnpm build` green.
- Browser: nav flows, mode switch rewrites configs, provider drill-in saves a
  key, old URLs redirect.
