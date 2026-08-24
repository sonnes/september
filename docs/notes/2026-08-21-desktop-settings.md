---
title: Desktop settings — implementation notes
plan: ../plans/2026-08-21-desktop-settings.md
---

# Desktop settings — implementation notes

What the plan does not say.

## The sections that shrank

The plan named two sections. Both are built. The plan also named an About you
section under Writing help, and that is where the speaking style and the
personal words live. There is no Account section and no "Run setup again"
action.

## The Setup screen shows only the services

The plan gave the Setup screen the mode cards and the connections. The mode
cards are removed: the setup steps ask how September runs, and one answer in
two places lets the two disagree. The screen now shows only the connections.

This also removed `modeUpdate(mode, connections, current)` from
`src/settings-nav.ts`. Nothing called it — the Setup screen had the same three
lines inline — and with no mode control in settings there is no caller left.
`src/steps.tsx` writes the mode straight into the draft.

## The connections list has no spend

The web app puts a `ProviderSpendChip` on each connection row. The desktop app
counts no spend, so the row shows a state pill instead.

## The speaking style now reaches the model

`src/suggestions.tsx` sent `globalMd: ""`. Setup collected the speaking style
and the personal words, and nothing read them. `userContext()` in `src/ai.ts`
assembles the two, and the suggestions call sends it.

This is one addition outside the port. Without it, Writing help would edit a
value that no code reads.

## The browser link needs a permission

A plain `target="_blank"` link does nothing in a Tauri window. The Rust side
already registers `tauri-plugin-shell` for the apfel sidecar, so only two
items were missing: the `@tauri-apps/plugin-shell` package, and
`shell:allow-open` in `src-tauri/capabilities/default.json`.

`openInBrowser()` in `src/os.ts` is the only caller, so the rule "a screen
never talks to the backend" holds.

## One setting owns the voice

`saveServices()` in `src/os.ts` wrote a `services` setting that nothing read.
The voice chosen at `/connect` went there and was lost, so ElevenLabs spoke
with an empty voice id. Rust sends that as `""`, the service answers 404, and
the Mac speaks instead.

The writer is gone. `/connect` now seeds the `speech` setting through
`saveSpeech()`, which is the setting `/voice` owns. One setting holds the
voice, setup seeds it, and `/voice` changes it.
