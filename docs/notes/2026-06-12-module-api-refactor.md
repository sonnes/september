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
