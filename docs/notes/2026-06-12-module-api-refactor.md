---
plan: ../plans/2026-06-12-module-api-refactor.md
---

# Module API Refactor Notes

## 2026-06-12: Shared, UI, AI

- `@september/shared`: Root exports now cover small primitives only: `cn`, `MATCH_PUNCTUATION`, simple hooks, and pure shared types. Heavier modules use explicit subpaths: `autocomplete`, `indexeddb`, and `slides`.
- `@september/shared`: Removed feature-package coupling by moving the autocomplete React hook to `@september/editor` and keeping display/demo types structural.
- `@september/ui`: Removed audio transcript playback from generic UI. Transcript viewer components/hooks now belong to `@september/audio`.
- `@september/ai`: Root API is curated through small facade files for settings, generation, providers, schemas, and components. Internal imports are relative.
- `@september/ai`: `useGenerate()` can be called without options and defaults to Gemini `gemini-2.5-flash-lite`; it still reports not ready until the required API key exists.

Verification:

- `pnpm exec tsc --noEmit --pretty false -p apps/web/tsconfig.json`
- `pnpm exec vitest --run packages/shared/lib/autocomplete packages/shared/lib/indexeddb/kv-store.test.ts`
- `git diff --check`

## 2026-06-12: Analytics

- Public API reduced to three exports: `track(userId, event)`, `TrackedEvent`, `DashboardStats`. The three named loggers (`logMessageSent`/`logAIGeneration`/`logTTSGeneration`) were replaced by the single discriminated `track()` per review decision; all four call sites updated.
- `DashboardStats` now takes a `userId` prop instead of calling `useAccount()` internally, removing the package's `@september/account` dependency — analytics is now a leaf package (shared + tanstack + zod + uuid only).
- Stored IndexedDB shape (`{id, user_id, event_type, timestamp, data}`, db `analytics`/store `analytics_events` v1) kept byte-compatible; only the public payload shape changed. Provider fields relaxed from enums to `z.string()` so analytics no longer enumerates providers.
- Dropped as dead: `session_id`/`metadata` base fields, `EventStats`/`EventFilter`/`CreateAnalyticsEvent` types, `unique_users` aggregation, no-op `onInsert/onUpdate/onDelete` collection hooks, `parser: JSON` (wrapper defaults both), always-zero `tokens`/`chars` props on `ProviderUsageChart`.
- Bug found en route: old `log-event.ts` `await`ed `collection.insert()` as a Promise, but TanStack DB returns a `Transaction`; new `track()` uses `tx.isPersisted.promise.catch(...)` for fire-and-forget error logging.
- `pnpm install` also synced pre-existing lockfile drift: `packages/editor` already declared `@september/account` and `@september/chats` in its manifest but the lockfile hadn't been regenerated.

Verification:

- `pnpm exec vitest --run packages/analytics` (13 tests)
- `pnpm exec tsc --noEmit --pretty false -p apps/web/tsconfig.json`
- `git diff --check`
