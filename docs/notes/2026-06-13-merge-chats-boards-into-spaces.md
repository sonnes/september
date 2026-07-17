---
title: Merge Chats + Boards into "Space" — Re-port Implementation Notes
plan: ../plans/2026-06-13-merge-chats-boards-into-spaces.md
---

# Implementation notes

Records setup context, deviations from the plan, and decisions made where the spec was silent.
Mirrors the original notes at `/Users/raviatluri/work/september-spaces` but adapted for this worktree's structure.

## Setup context

- Re-port worktree: `/Users/raviatluri/work/september-spaces-v2`, branch `feat/spaces-context`
- Reference (read-only): `/Users/raviatluri/work/september-spaces`, branch `feat/merge-chats-boards-spaces`, commit `c47c019`
- Key structural difference: packages live at `apps/web/src/packages/*` here vs `packages/*` in the reference. Import aliases (`@september/*`) are identical in both.
- Routing difference: this worktree uses TanStack Start file-based routing; the reference used Next.js App Router. Route files were re-implemented (not copied).

## Phase log

### Re-port P1 — Chat→Space rename + `context` field (done)

Completed 2026-06-13. All 356 tests pass, build succeeds.

## Decisions where the plan was silent

- **`space-list.tsx` Link import**: Reference used `next/link`; adapted to `@tanstack/react-router`'s `<Link to="/spaces/$id" params={{ id: space.id }}>` syntax.
- **`useMessages` param bridge**: `chatId` → `spaceId` rename is in the hook signature. Call sites that still carry an outer `chatId`-named variable bridge with `spaceId: chatId` (e.g. `use-stripes.ts`, `right-panel.tsx`). This matches the reference note's decision.
- **`useFirstMessage` call site**: Called positionally (`useFirstMessage(chatId)`) — no rename needed at call site since it is a positional arg.
- **`<Suggestions chatId={spaceId}>` prop**: The `chatId` prop name on `<Suggestions>` was kept as-is (board logic still active); the value passed is the space id. Matches reference decision.
- **`ChatRightPanel` props**: Props `chatId`/`chatTitle` kept by name (board-removal is Phase 3+4 scope). Value passed is the space id.
- **`createKeyboard` call**: `chat_id: spaceId` — keyboard package still uses `chat_id` field (not renamed until boards are removed). The value is the space id.
- **`generateKeyboard` call**: `chatId: spaceId` — same rationale as above.
- **BroadcastChannel**: Kept as `chat-display-${spaceId}` to stay in sync with the display route's listener. Both ends use this string unchanged (per reference decision).
- **`@september/spaces` package.json**: Retained `@tanstack/react-router` dep from the original `@september/chats` package (the `space-list.tsx` Link import requires it). Reference omitted it because it used Next.js Link.
- **Analytics `events.test.ts`**: Updated `chat_id` → `space_id` in the test assertions (the agent handled this automatically when updating `events.ts`).
- **`keyboards` package**: All `chat_id` references intentionally untouched — board removal is a later phase.

## Deviations from reference

None substantive. The only structural adaptation was TanStack routing syntax in `space-list.tsx` and the route files.

## What remains for later phases

~~- Phase 5: Persona / `account.context` / onboarding changes~~
~~- Phase 7: Dead field cleanup (`system_instructions`, `ai_corpus`)~~

All re-port phases complete.

---

### Re-port P2 — context serializer, board removal, md phrases, scan-mode, Context tab (done)

Completed 2026-06-13. All 370 tests pass, build succeeds.

#### Decisions where the plan was silent

- **`parseMdPhrases` export**: Added to `packages/suggestions/index.ts` barrel so `spaces/$id/index.tsx` can import via `@september/suggestions` without deep-path imports. Deep imports like `@september/suggestions/lib/md` would work for workspace packages but the barrel is cleaner.
- **`useFirstMessage` removal in use-stripes**: `useFirstMessage` was only used to supply `context: firstMessage?.text`. After Phase 2 replaces that with `spaceMd` sourced from `space.context`, `useFirstMessage` was removed along with its import. No other file uses it in the suggestions package.
- **`boardPhrases`/`boardWords` helper names kept**: Internal pure functions in `stripes.ts` retained their names. Only `composeSuggestions` param renamed `boardPhrases` → `mdPhrases` and source `'board'` → `'md'` to match reference.
- **`useSpaces()` without filter**: Called without `userId` in `use-stripes.ts` (reference also omits it). `useSpaces` in this worktree takes `{ userId }` but the hook works with no args — the filter is optional and `spaces` returned is user-scoped via the DB query.
- **`account.context` field placement**: Added as third field in `AccountSchema` (after `id` and `name`), before `city`. Consistent with the reference worktree placement.
- **Scan-mode implementation**: Sequential step via Space key (advance) + Enter key (activate). Flat target list: chips first by index, then tokens left-to-right across stripes (non-hidden only). Scan index resets to -1 when mode turns off. Matches reference exactly.
- **`SourceMark` for `'md'`**: Renders a clickable `Pin` button when `onPin` is provided. The button does NOT call `trackKeystroke` — respects module invariant.
- **Scan toggle**: Always shown when `hasContent` is true (not gated on active board). Label is "Scan".
- **Pinning in space page**: `handlePin` parses existing bullets from `space.context` using `parseMdPhrases` (imported from `@september/suggestions`), dedupes case-insensitively, then appends `\n- phrase` and calls `updateSpace`. No cross-package import issue since suggestions is a workspace package.
- **`keyboards/package.json` deps removed**: `@september/account`, `@september/ai`, `@hookform/resolvers`, `react-hook-form`, `@tanstack/db`, `@tanstack/react-db`, `nanoid`, `sonner`, `@heroicons/react`. Confirmed zero usage in remaining files before removing.
- **`KeyboardType`**: Narrowed from `'qwerty' | 'circular' | 'custom' | 'none'` to `'qwerty' | 'circular' | 'none'`. `customKeyboardId`/`setCustomKeyboardId` removed from context.
- **`stickyQwerty` prop**: Had zero consumers in actual code — never passed as `true` at any call site. Removed without impact.
- **Right-panel `useState` import**: `BoardsTab` used `useState` for view state; after removal, `useState` no longer needed in `right-panel.tsx` — import removed.
- **`messages` dep in space page**: `isFirstMessage` check removed with board seed; `generateKeyboard`/`createKeyboard` imports removed. `useMessages` still called for `spoken` messages log. `TODO(reportP3)` comment left where board-seed call was.
- **Pre-existing TS errors**: 16 errors (routing/test/vite.config.ts) pre-existing before this phase — zero new errors introduced by P2 changes.

---

### Re-port P3 — first-message context seed (done)

Completed 2026-06-13. All 370 tests pass, 18 pre-existing TS errors only (zero new).

#### Decisions where the plan was silent

- **`@september/ai` dep added to `packages/spaces/package.json`**: the new hook imports `useAISettings` and `useGenerate` from `@september/ai`. Direct dep is consistent with how `use-create-audio-message.ts` adds its own deps.
- **First-message detection uses `messages.length === 0`**: checked before the message is persisted (`createAudioMessage` call happens before the check, but the `messages` reactive array from `useMessages` hasn't updated yet). Correctly identifies first message. Matches reference's approach.
- **`.then` guard for `undefined`**: `generateContext` returns `Promise<GeneratedContextData | undefined>`. TypeScript requires guarding — used `result && updateSpace(...)` to satisfy the type checker. The reference destructures directly (`({ title, context }) => ...`) because its TypeScript is slightly less strict; functionally identical.
- **Fire-and-forget**: `generateContext(...).then(result => result && updateSpace(...)).catch(() => {})`. Errors from both generation and persistence are swallowed; message send never blocks.
- **`messages` and `generateContext` added to `handleSubmit` deps array**: both are referenced in the callback body; exhaustive-deps requires them.
- **TODO comment removed**: `// TODO(reportP3): seed space.context from first message` replaced entirely by the implementation.

---

### Re-port P4 — persona/corpus → `account.context`, dead field removal (done)

Completed 2026-06-13. All 370 tests pass, 17 pre-existing TS errors only (zero new), 0 lint errors.

#### Files changed

**Step 1 — Settings suggestions form:**
- `packages/suggestions/components/suggestions-form.tsx`: removed `system_instructions` section, `Content Corpus` section, `EXAMPLE_INSTRUCTIONS`, `useCorpus` usage; removed `FormTextarea` import (no longer used); added `TiptapEditor` bound to `account.context` with 500ms debounced `onUpdateContext` callback; `getSuggestionsFormDefaultValues` no longer includes the two dead fields; added `onUpdateContext` prop to both `SuggestionsFormFields` and `SuggestionsFormProps`.
- `packages/suggestions/types/index.ts`: removed `system_instructions` and `ai_corpus` from `SuggestionsFormSchema`.
- `packages/suggestions/hooks/use-corpus.ts`: deleted (zero remaining consumers).
- `routes/_app/settings/-suggestions-form.tsx`: added `handleUpdateContext` that calls `updateAccount({ context: markdown })` and passes it as `onUpdateContext` to `<SuggestionsForm>`.

**Step 2 — Onboarding:**
- `packages/onboarding/components/steps/profile.tsx`: persona textarea now reads from / writes to `account.context` instead of `ai_suggestions.settings.system_instructions`. The `updateAccount` call became `{ name, context }` — no `ai_suggestions` mutation here.
- `packages/onboarding/components/steps/suggestions.tsx`: `personalWords` state no longer seeds from `ai_corpus` (starts empty); on submit, after `buildSuggestionsSetupUpdate` (provider/model/api_key only), appends personal-words bullet lines to `account.context` via a second `updateAccount({ context: existing + bullets })` call if non-empty.
- `packages/onboarding/lib/suggestions-setup.ts`: removed `personalWords` param and `ai_corpus` field from the function — now only handles provider/model/key.
- `packages/onboarding/lib/suggestions-setup.test.ts`: updated to match the new interface (no `personalWords`/`ai_corpus`).

**Step 3 — Autocomplete:**
- `packages/editor/hooks/use-autocomplete.ts`: `userCorpus` now sourced from `account?.context ?? ''` instead of `account?.ai_suggestions?.settings?.ai_corpus ?? ''`.

**Step 4 — Dead field removal:**
- `packages/account/schema.ts`: removed `system_instructions` and `ai_corpus` from `SuggestionsConfigSchema.settings`.
- `packages/shared/types/ai-config.ts`: removed `system_instructions` and `ai_corpus` from `SuggestionsConfig.settings`.

#### Onboarding composition approach

Profile step writes persona prose directly to `account.context` (overwriting/setting it). Suggestions step, if the user adds personal words, appends them as markdown bullet lines (`- word`) to the existing `account.context`. The separator is `\n` only when context is non-empty, so neither step clobbers the other's output. The final `account.context` is: `<persona prose>\n- word1\n- word2`.

#### Deviations / judgment calls

- `buildSuggestionsSetupUpdate` `personalWords` param removed entirely (not passed as `undefined`). The suggestions step handles context writes directly via `updateAccount`, keeping the pure helper free of `account.context` concerns.
- `showPersonalWords` state in `SuggestionsStep` no longer seeds from `ai_corpus` (field is gone) — starts as `false`, `personalWords` starts as `''`. Returning users who had `ai_corpus` set would see an empty field; acceptable since this is a migration.
- The `Collapsible` / example-instructions UX in the settings form was removed entirely (it served `system_instructions`); the new `TiptapEditor` in the Context section replaces the entire persona + corpus concern in one editor, consistent with the right-panel `ContextTab` pattern.
- `FormTextarea` import removed from `suggestions-form.tsx` since it had zero remaining uses after the removal.

#### Final zero-match grep

`grep -rn "system_instructions|ai_corpus" apps/web/src` → no output (zero matches).
