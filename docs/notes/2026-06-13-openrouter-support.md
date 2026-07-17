---
title: OpenRouter Support — Implementation Notes
plan: ../plans/2026-06-13-openrouter-support.md
---

# Implementation notes

Records decisions where the spec was silent, deviations, and reviewer-relevant context. Not a restatement of the plan.

## Decisions / resolutions

- **Provider version pin: `@openrouter/ai-sdk-provider@^1.5.4`.** `@september/ai` resolves `ai@5.0.116`. The provider's `2.x`/`latest` (2.9.1) peers `ai@^6`; the `1.x` line (1.0.0–1.5.4) peers `ai@^5.0.0` + `zod ^3.24.1 || ^4` — the match for our tree. (The stray `ai@6.0.199` under `apps/web/node_modules` is incidental; `@september/ai` resolves v5.) Resolved + verified `createOpenRouter` exports.

- **Curated model `openai/gpt-5.4-mini`** instead of the plan's placeholder `openai/gpt-5.2-mini` (verified against `GET /api/v1/models` — `gpt-5.2-mini` does not exist; `gemini-2.5-flash-lite`, `gemini-2.5-flash`, `claude-haiku-4.5` do).

- **Deviation: extracted `buildTextInput()` into `packages/ai/lib/audio-message.ts`** rather than inlining the multimodal-message spread in `use-generate.ts` (as the plan sketched). Reason: makes the audio→messages construction unit-testable without mounting the hook (no React/account/AI-SDK mocking). The hook now spreads `...buildTextInput(prompt, audio)`. Tested in `audio-message.test.ts`.

- **OAuth callback handled on the existing `settings/providers/form.tsx`** via `useSearchParams` (mirrors the `voices` page pattern — no Suspense wrapper needed, that page tree is already `'use client'`). No new route added, per "edit existing files" rule.

- **Analytics `provider` now passed verbatim** (was `provider === 'gemini' ? 'gemini' : undefined`). The analytics event schema types `provider` as a free string (`z.string().default('gemini')`), so `'openrouter'` flows through cleanly and shows up in `by_provider` summaries.

- **Known dev caveat (not a prod issue):** the callback effect guards re-entry with a ref + strips `?code` via `router.replace`. Under React 19 StrictMode's dev double-invoke the ref persists (same fiber), so the single-use code is exchanged once; worst case in dev is a stray error toast. Production (no double-invoke) is unaffected.

- **Transcription capture UI is intentionally absent** (recording package was deleted in `daefebd`). This change ships the transcription *capability* — provider-configurable settings + `useTranscribe` (client-side, user key) — verified via the `audio-message` unit test. Wiring a mic-capture control into a conversation is a separate follow-up (flagged in the plan's Out of scope).
