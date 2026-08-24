---
plan: docs/plans/2026-08-24-copy-vocabulary.md
---

# Copy vocabulary — implementation notes

Decisions made where the plan was silent, and deviations.

- Shared `packages/app-ui` screens cannot know the platform, so they say
  "this device". The app-owned rules files say "this Mac" (desktop) and
  "this browser" (web). The plan's Mac/browser split applies only to
  app-owned copy.
- Route slugs, setting keys, data kinds (`starter`), CSV headers, and enum
  values are untouched: they are identifiers, not copy. The Usage and Today
  screens map stored values to plain words at render time (`sourceLabel`,
  `providerLabel` in `packages/app-ui/blocks/usage.tsx`). `providerLabel`
  also fixes brand casing: the old CSS `capitalize` rendered "Openrouter".
- The Services page keeps one heading pair: page title "Services", section
  title "Connect a service". The plan replaced both "Setup" and
  "Connections" with one name; a literal duplicate heading would read as a
  bug, so the section title uses the standard verb instead.
- The key-panel error line rendered `String(reason)` plus ". Copy the key
  again.", which produced "Error: …. Copy the key again." The panel now
  shows `error.message` alone, and each thrown message carries its own next
  step. Rust command rejections (plain strings) render unchanged.
- Rust internal invariant errors (repository validation like "must contain
  1 to 256 bytes") indicate bugs, not user mistakes. They keep their
  precision; only strings a user can plausibly trigger were reworded.
- "ElevenLabs answered {status}" and "HTTP {n}" stay as detail fragments:
  they now land inside the parenthesis of the rewritten provider error
  sentences, which is the standard's place for a status code.
- The marketing page kept its warmer register; only casing ("Get started"),
  the "Preview" → "Hear it" verb, and the `Pin` aria-label changed there.
- The speech-settings reset button reads "Back to how it usually sounds":
  the sliders change how the voice sounds, so a "voice" noun would claim
  the voice itself changes.
- Test expectations were updated in the same pass: desktop
  `settings.test.mjs` and `bootstrap.test.mjs` (window titles, Read aloud),
  Rust `tests/apfel.rs` (error sentence), web `home-redesign.test.tsx`
  ("Hear it").
