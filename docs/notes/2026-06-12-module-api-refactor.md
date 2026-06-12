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

## 2026-06-12: Audio

- Deleted transcript viewer (`transcript-viewer.tsx` + `use-transcript-viewer.ts`, 843 lines, zero consumers) per review decision — it had been moved from `@september/ui` in the previous pass but nothing uses it; lives in git history. This dropped the `@elevenlabs/elevenlabs-js` dependency.
- Audio player rewritten on a single `HTMLAudioElement` engine, dropping `react-use-audio-player` (Howler). The old code ran three parallel playback paths (Howler, hand-rolled sinkId element, speechSynthesis) with duplicated state merged at the end. Public `useAudioPlayer` API unchanged. RAF-based time tracking kept (native `timeupdate` is too coarse for word highlighting).
- `AudioProvider`/`useAudio` context and the fieldless `AudioService` class replaced with plain functions in `storage.ts` (`uploadAudio`, `uploadAudioBinary`, `downloadAudio`, `getAudio`, `deleteAudio`, `listAudio`). Same IndexedDB layout (`september-audio`/`audio-files`). Functions throw; toasts moved to the chats call sites that had them. One provider removed from the app root.
- Also deleted: `audio-utils.ts` (zero callers), orphan `use-audio-output-devices.test.ts` (tested a hook that no longer existed). `ReelOverlay`/`ReelSyncOverlay`/`TextViewerWord`/`useTextViewerContext`/`CharacterAlignment` unexported (internal only). `sonner` and `zod` deps dropped (unused after refactor).
- package.json `exports` narrowed to `"."` only; documents' deep subpath imports moved to the root barrel; internal self-imports (`@september/audio/...`) converted to relative.
- Subagent review caught two bugs in its player rewrite, fixed by hand: spreading `MediaDeviceInfo` (`{...d}`) drops `deviceId` in real browsers because the properties are prototype getters (tests passed because mocks were plain objects — explicit `{deviceId, label}` mapping restored), and the utterance path never reset `isPlaying` on end.

Verification:

- `pnpm exec vitest --run packages/audio` (32 tests)
- `pnpm exec tsc --noEmit --pretty false -p apps/web/tsconfig.json`
- `git diff --check`

## 2026-06-12: Chats

- Mutations are now plain async functions (`createChat`, `updateChat`, `deleteChat`, `createMessage`) in `mutations.ts`; the five mutation hooks were deleted. This establishes the convention going forward — `apps/web/CLAUDE.md` (AGENTS.md) updated: mutations are plain functions that throw, toasts at call sites, hooks reserved for live queries and stateful flows. `useCreateAudioMessage` stays a hook (speech pipeline with real status).
- Root-cause bug fixed across all mutations: `await collection.insert/update/delete()` awaited a TanStack DB `Transaction` (not a Promise), so loading flags and error handling never worked. Now `await tx.isPersisted.promise`. Same bug class found earlier in analytics.
- `deleteChat` now cascade-deletes the chat's messages (ChatList's dialog always promised this; previously messages orphaned in IndexedDB).
- `createMessage` strips transient `editorStats` before insert (was previously spread into the stored record).
- `message-list.tsx`: replaced Node `Buffer` base64 round-trip with `FileReader.readAsDataURL` (no Buffer in client code).
- Added `timeAgo` (Intl.RelativeTimeFormat) to `@september/shared`; chats dropped `moment`. `documents` and the display page still use moment — migrate in their passes.
- Dropped dead deps `uuidv7`, `@headlessui/react`; deleted dead `useDeleteMessage`. Exports narrowed to root barrel.
- chats/page guard: `createChat` requires a user id; page now toasts "Account not ready yet" instead of silently creating a chat with empty `user_id`.
- Deleted pre-existing orphan `packages/shared/lib/indexeddb/collection.test.ts` — it imported `./collection` (v1), which doesn't exist on this branch; it broke any full run of the shared suite.

Verification:

- `pnpm exec vitest --run packages/chats packages/shared` (196 tests)
- `pnpm exec tsc --noEmit --pretty false -p apps/web/tsconfig.json`
- `git diff --check`

## 2026-06-12: Cloning

- Dissolved `CloningProvider` and all three contexts. `VoiceCloneForm` is self-contained (owns `useUpload()` + `useRecording()`, prop-drills to its two sections); the clone page renders just `<VoiceCloneForm />`. The `sharedStorage` threading existed to share one AudioService instance — obsolete since audio storage became plain functions.
- The voices page no longer mounts recording machinery: it calls plain `getVoiceSamples`/`downloadVoiceSample`/`findSimilarVoices` directly. Fixed the subagent's userId sourcing there (`account?.id` → `user?.id` to match the hooks; both resolve to `'local-user'` today but shouldn't be allowed to diverge).
- `ElevenLabsVoiceClone` class → plain `cloneVoice(apiKey, opts)` / `findSimilarVoices(apiKey, files)` with one shared error parser. `useVoiceStorage` hook → plain functions with explicit userId (same `voice-samples/${userId}/${type}/` path scheme — stored data unaffected).
- Dropped dead deps `@elevenlabs/elevenlabs-js` (the client uses raw fetch) and `react-webcam`. Dropped never-validating `VoiceSampleSchema` zod and the context types. Exports narrowed to root barrel; self-imports made relative.
- Kept as-is: `MediaRecorderManager`, `useMediaRecorder`, `useAudioPlayback`, `collectSampleIds` (clean, tested internals).

Verification:

- `pnpm exec vitest --run packages/cloning` (23 tests)
- `pnpm exec tsc --noEmit --pretty false -p apps/web/tsconfig.json`
- `git diff --check`

## 2026-06-12: Documents

- Fixed a package→app boundary violation: `use-file-upload` imported the app's `GeminiService` via the `@/` alias. Text extraction moved into `@september/ai` as `extractText(apiKey, files)` (gemini-2.5-flash, same prompt; files passed as ArrayBuffer file parts — no base64 round-trip, no `@google/genai` dep). `apps/web/services/gemini.ts` untouched; note its `extractText` method and the three `/api/*` routes wrapping it now have zero in-repo callers.
- New `EditableText` in `@september/ui` (click-to-edit, save on blur/Enter, Escape cancel, revert on error) replaces the duplicate title editors; `EditableDocumentTitle` (22 lines) and `EditableChatTitle` (34 lines) are now thin wrappers.
- Mutation hooks → plain `createDocument`/`updateDocument`/`deleteDocument` per convention (same Transaction-await bug fixed); toasts moved to call sites.
- `useDocument(id)` now used by SlidesPresentation and both `[id]` pages instead of `useDocuments()` + `.find`; the hook returns `undefined` when called without an id (previously the unfiltered query surfaced an arbitrary first document — fixed on review).
- Deleted dead `slide-renderer.tsx` and `slide-text-viewer.tsx`; dropped unused `remark`/`remark-gfm`/`remark-html` (slide parsing lives in shared/slides) and `moment` (→ `timeAgo`). Dropped the `documentCollection` root export. Self-imports made relative; exports narrowed to root.

Verification:

- `pnpm exec vitest --run packages/documents packages/chats packages/ai packages/ui` (30 tests)
- `pnpm exec tsc --noEmit --pretty false -p apps/web/tsconfig.json`
- `git diff --check`

## 2026-06-12: Editor

- Public surface narrowed to the 4 symbols actually consumed (`EditorProvider`, `useEditorContext`, `Editor`, `TiptapEditor`) + `EditorStats`/`EditorContextValue` types. `Autocomplete` component, `useEditorLogic`, `useAutocomplete` are now internal (still relative-importable, just not in the barrel).
- Fixed a package→app boundary violation: `autocomplete.tsx` imported the suggestion chip from the app (`@/components/ai-elements/suggestion`). Per review, the chip moved into `@september/ui` (`Suggestion`/`Suggestions`); the app copy (its only consumer) was deleted.
- Dropped the dead v2 `suggestWord` from the `useAutocomplete` hook surface (no caller; the live component uses `getSpellings`/`getNextWords`). The engine's `suggestWord` in shared/autocomplete is untouched, so it can be resurfaced when a UI needs it.
- Dropped genuinely dead deps `trie-search`, `wink-pos-tagger`, and `zod` — imported nowhere in the package (nor elsewhere in the repo, for the first two). Kept the substantive caching/persistence comments in use-autocomplete.ts.
- Note: an unrelated `apps/web/app/mock/` prototype (Project Voice–style sentence-suggestion mock) appeared untracked during this session — NOT part of this refactor and deliberately left out of the commit.

Verification:

- `pnpm exec vitest --run packages/editor packages/ui packages/shared` (183 tests)
- `pnpm exec tsc --noEmit --pretty false -p apps/web/tsconfig.json`
- `git diff --check`

## 2026-06-12: Keyboards

- Public surface was ~25 barrel exports for an API that's really 5: `KeyboardProvider`, `KeyboardRenderer`, `KeyboardToggleButton`, `useGenerateKeyboardFromMessage`, `createKeyboard`. `KeyboardRenderer` internally orchestrates Qwerty/Circular/Custom keyboards + editor + custom-keyboard query/delete hooks, so all of those are now internal building blocks.
- Mutations → plain `createKeyboard`/`updateKeyboard`/`deleteKeyboard` (same Transaction fake-await bug fixed); toasts moved to call sites (chat page keeps its single "keyboard generated" toast — removed the old double-toast; CustomKeyboardEditor gained "Keyboard created/updated" + an `isSaving` state; KeyboardRenderer keeps its delete toasts). Only `createKeyboard` is public; update/delete are internal. `createKeyboard` now requires `user_id` (dropped the account fallback — both callers pass it).
- `updateKeyboard` returns a `{...draft}` shallow copy instead of `JSON.parse(JSON.stringify(draft))`, which was corrupting `Date` fields to strings.
- Deleted dead `CustomKeyboardList` (zero consumers), the 4-line `use-keyboard-context` backwards-compat re-export, and the `hooks/index.ts` export-star barrel. Added missing `nanoid` dep (was used but undeclared, working only via hoisting). Self-imports → relative; exports narrowed to root.

Verification:

- `pnpm exec vitest --run packages/keyboards` (15 tests)
- `pnpm exec tsc --noEmit --pretty false -p apps/web/tsconfig.json`
- `git diff --check`

## 2026-06-12: Recording (deleted)

- `@september/recording` (webcam video + TTS-audio capture, ffmpeg MP4 conversion, 538 lines) had zero consumers anywhere in the repo — built but never wired into a page. Per user decision, deleted the whole package rather than refactoring a module with no caller.
- Removed it from `apps/web/package.json` deps and the `next.config.ts` transpile list. The `@ffmpeg/ffmpeg`/`@ffmpeg/util` deps leave the tree with it; `react-webcam` stays because the display page (`apps/web/app/display/[id]/page.tsx`) uses it via the app's own dependency. Recoverable from git history if a recording feature is ever built.

## 2026-06-12: Speech (biggest refactor — needs manual QA)

- Unified two parallel speech-settings stacks that both wrote to `account.ai_speech` but each dropped fields the other had. Deleted the 546-line `SpeechSettingsForm` (modal stack, own schema) and the `VoicesForm` render-prop wrapper; replaced the app's 213-line settings-page render-prop body with a 28-line wrapper. Net −937/+139.
- One `SpeechSettings` component now drives BOTH the modal (chats/talk) and the settings page: provider cards + model select + inline voice search/list + per-provider advanced sliders + inline save/status. One `VoiceSettingsSchema`, one `useVoiceSettings` hook (over `useVoiceFetching` + `useProviderModels`).
- Fixed 3 real bugs surfaced by the merge: (1) the chats/talk modal never persisted `model_id`; (2) the settings page never persisted advanced `settings` (sliders); (3) `SpeechEngineId` was typed `browser|gemini|elevenlabs`, so **kokoro couldn't be selected on the settings page** — broadened to include kokoro everywhere.
- Public API: `SpeechProvider`, `useSpeechContext`, `SpeechSettings`, `SpeechSettingsModal`, `VoicesList` (kept — the onboarding speech step renders it directly with its own nav), `useSpeech`/`UseSpeechReturn`, `VoiceSettingsFormData`. Dropped the `export *` of the 4 TTS providers + raw schemas from the barrel (no external consumers). Self-imports → relative; exports narrowed.
- **UX normalization (intentional):** both surfaces previously had different sticky submit chrome (dialog footer vs fixed bottom bar); now a single in-form Save button + status. Modal keeps a Cancel in its footer and closes on successful save.
- Both modal sites (chats/[id]/layout, talk/layout) confirmed to have a `SpeechProvider` ancestor (required now that the modal browses voices inline).
- **Manual QA required** (two live settings surfaces re-rendered from one source): settings page voice browse + save persists model_id AND settings; chats + talk modal save persists both and closes; onboarding speech step; each provider's advanced sliders; kokoro now selectable on the settings page.

## 2026-06-12: Onboarding

- Small, clean module. Public API curated to `OnboardingProvider` + `OnboardingFlow` (the only two symbols the page imported). `useOnboarding` stays exported from the provider for the 5 step components but is out of the public barrel.
- Inlined the single-use `useOnboardingLogic` hook directly into `OnboardingProvider` (deleted `hooks/use-onboarding.ts` and the `hooks/` dir) — provider+hook split collapsed to one file.
- Deleted the dead generic `OnboardingStep` component and its `OnboardingStep`/`OnboardingProps`/`StepProps` types (the 5 steps are bespoke and render directly in the flow's switch; nothing used the wrapper). Kept `OnboardingContextValue`.
- Dropped unused `zod` dep. Self-imports → relative; exports narrowed to root.
- On review, removed a redundant `router.push('/talk')` in `complete.tsx` that fired right after `completeOnboarding()` already redirects — and the now-unused `useRouter` import/var with it.

Verification:

- `pnpm exec tsc --noEmit --pretty false -p apps/web/tsconfig.json`
- `git diff --check`
