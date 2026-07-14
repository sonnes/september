---
plan: docs/plans/2026-07-13-settings-redesign.md
---

# Settings redesign — implementation notes

Decisions where the plan/mock was silent, and deviations.

- **Mode persistence**: added `setup_mode` to the account rather than deriving
  only — deriving alone can't represent "advanced" (clicking it changes no
  configs). Inference is the fallback for accounts created before the field.
- **Mode lib stays in `onboarding/lib/setup-modes.ts`**: settings imports from
  `@/packages/onboarding`. Copy and builders stay single-sourced; moving them
  to a new package would churn onboarding for no behavior change.
- **On-device rows show static copy** ("Downloads once… works offline"), no live
  download state or Download buttons — wiring Kokoro/Whisper/WebLLM cache
  status into Setup is a follow-up (plan: out of scope).
- **Feature pages reuse the existing forms** unchanged; only titles,
  descriptions, and callout targets changed. The mock's via-chip/disclosure
  layout is a follow-up. The forms' internal copy ("Enable AI Suggestions",
  "AI Provider") still uses system vocabulary — same follow-up.
- **`/settings` search typing**: `validateSearch` must return `{ code?: string }`
  (optional property), not `{ code: string | undefined }`, or every
  `Link to="/settings"` fails typecheck with a required-search error.
- **Deleted `-providers-form.tsx`** (the bulk key editor route wrapper). The
  package components `AIProvidersForm`/`ProviderSection` in `@/packages/ai` are
  now unused by the app but left exported — candidate for later removal.
- **Base URL editing dropped**: the old bulk form exposed per-provider
  `base_url`; the new connection pages save `api_key` only. `base_url` stays in
  the schema and import/export.
- **Pre-existing console error observed** (not from this change; also fires on
  a fresh `/dashboard` load): "Can't perform a React state update on a
  component that hasn't mounted yet."

## Feature-form redesign (second pass)

- **Autosave replaces Save buttons** on Voice / Writing help / Listening —
  discrete controls save immediately, sliders on release (`onValueCommit`),
  personal context debounced 500 ms. Status surfaces as a small
  "Saving… / Saved" indicator on the Powered-by line; failures toast.
- **Shared pieces** live in `src/components/settings/`: `feature-providers.ts`
  (tested pure lib: per-feature provider options, connected flags, mode note,
  default models), `feature-section.tsx` (PoweredByLine, FeatureToggleRow,
  MoreOptions, SavedIndicator, OptionField), `use-autosave.ts`.
- **Provider choice is a chip-style Select** on each feature page; disconnected
  providers stay listed but disabled ("— not connected") with a hint linking
  Setup. Changing a chip does NOT change `setup_mode` — the mode stays what the
  user picked in Setup.
- **Switching voice provider resets the voice** (Kokoro presets Heart);
  switching writing/listening provider resets the model to the registry
  default.
- **Chat right-panel and the speech modal still use the old `SpeechSettings`**
  tabs — replacing those embeds with the new pieces is a follow-up. Package
  components now unused by the app: `AIProvidersForm`, `ProviderSection`,
  `SuggestionsForm`, `TranscriptionForm` (kept exported).
- **Gemini speech models are hard-filtered to the two TTS models** in the Voice
  form (the registry list mixes text and TTS models).

## Design-review fixes (third pass)

- **Mobile settings nav** collapses to horizontal title-only pills below `md`
  (the aside "Settings" h2 hides too) so content stays above the fold.
- **Primary row actions** ("Set up ›", voice "Use") bumped from `size="sm"` to
  the default size per DESIGN §6.
- **`ModeBadge`** (onboarding package) is now the single home for the
  emerald/amber/sky accent shades — used by the onboarding mode step and the
  Setup page.
- **`VoicesList` restyled to tokens** (`bg-card`, `text-foreground`,
  `rounded-lg`, shadcn Button) — also affects its other consumer, `/voices`.
- **Account autosaves** like the feature pages (checkboxes immediate, text
  debounced; invalid states like an empty name are held, not saved). Save
  button removed; Export JSON is now the filled button, Import outline.
  External account changes (import) only reset the form when it has no unsaved
  edits.
- **`LabeledSlider`** adds live value readouts (1.2x, 65%) to all sliders.
- **Tiptap placeholders were invisible app-wide** — the Placeholder extension
  was configured but the `.is-editor-empty::before` CSS didn't exist; added to
  `globals.css`.
- Voice page's duplicate "Voice" section heading removed; blocked toggles now
  say why they're disabled; connection detail uses `PageTitle`.
