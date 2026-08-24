# Phrase codes, sentence starters & per-space corpus

- **Mock (approved direction):** archived — `git show archive/old-docs:docs/mocks/2026-07-18-shortcuts-and-corpus.html`
- **Notes file (during implementation):** `docs/notes/2026-07-18-phrase-codes-starters-corpus.md`
- **Status:** Phases 1–5 implemented (2026-07-19); Phase 6 pending its 6a experiment gate

One thesis, three pieces, no new machinery:

1. **Phrase codes** — `SavedPhrase` gains an optional `code` (`ty` → "thank you"). Typing a code surfaces its phrase at the top of the existing suggestion stripe; one tap swaps the typed code for the phrase.
2. **Sentence starters** — the phrase generator also returns 3–5-word prefixes, stored in the same table (`kind: 'starter'`), rendered as a stripe row variant (dashed tiles, `…` end key).
3. **Per-space corpus seed** — the same generation call returns ~100 space-typical sentences that prime the on-device n-gram autocomplete (validate-first; Phase 6).

Everything renders through the existing `SuggestionStripes` word-tile component — three row kinds differentiated by gutter icon, tile tint, and end key. Management lives in the existing Phrases tab.

## Decisions (defaults from mock review — override at approval)

| Question | Decision |
| --- | --- |
| Expansion UX | Ranking rule in existing stripe; no inline auto-replace. |
| Speak with bare trailing code auto-takes match | **Off** for v1. |
| Cross-space code lookup | **Yes** — current space wins conflicts. |
| Code casing | Stored lowercase; matched case-insensitively on the word at the caret (trailing word of composer text). |
| Code validity | 2–5 chars, letters/digits, not a dictionary word, unique across the user's codes. A **user-set** code pins the row (**user code ⇒ pinned**). |
| AI-seeded codes | Seeding/regen assigns codes to AI phrases too — generated **deterministically client-side** (`generateCode`, not the LLM), so validation and collision handling are uniform. AI codes live and die with their rows: replaced on regen, promoted to durable when the user pins the phrase. |
| Starters storage | Same table, `kind: 'phrase' | 'starter'`; missing `kind` parses as `'phrase'` (no migration). |
| Empty-composer row mix | 3 phrases + 2 starters (constants, easy to tune). |
| Notes mode | Code ranking applies wherever the stripe renders (it keys off editor text; no tiptap-specific work expected — verify in Phase 2). |
| Starter pack | A few pinned-with-code rows added to `DEFAULT_SPACE_SEED` (e.g. `ty` → Thank you, `iwb` → I want to go to the bathroom, `hlp` → I need some help please). |
| Mining | Local only, no LLM. Computed when Phrases tab renders; dismissed-set in `localStorage`. |
| Corpus seeding | Gated on an offline experiment (Phase 6a). Cloud providers only at first if WebLLM can't produce usable output. |

## TDD discipline

Every phase: write failing tests → run (`pnpm -C apps/web test`) → implement minimum → green. Before each commit: `pnpm -C apps/web lint && pnpm -C apps/web test && pnpm -C apps/web build`. Read + update each touched module's `README.md`.

---

## Phase 1 — Data model & code helpers (`@/packages/spaces`)

**Files:** `types/index.ts`, `lib/codes.ts` (new), `lib/codes.test.ts` (new), `mutations.ts`, `lib/phrases.ts`, `README.md`.

1. `SavedPhraseSchema`: add `code: z.string().optional()`, `kind: z.enum(['phrase', 'starter']).default('phrase')`.
   - Test: existing row without `kind`/`code` parses to `kind: 'phrase'`.
2. New pure lib `lib/codes.ts`:
   - `normalizeCode(raw)` — trim, lowercase.
   - `validateCode(code, { existingCodes, isWord })` → `ok | { reason: 'format' | 'dictionary' | 'duplicate', suggestion? }`. `isWord` is injected (the autocomplete dictionary check lives in the caller; keeps the lib pure). `suggestion` mutates a colliding code (`its` → `itx`).
   - `matchCode(trailingWord, rows, currentSpaceId)` → the matching `SavedPhrase | undefined`; exact case-insensitive; current-space rows win.
   - `generateCode(phrase, { existingCodes, isWord })` — content-word initials (stopwords dropped), ≤ 4 chars, mutate on dictionary/duplicate collision. Lives here (not Phase 5) because seeding uses it too.
   - Tests for all four (format bounds, dictionary hit, duplicate, cross-space conflict resolution, empty trailing word, code-gen collisions/mutation).
3. `mutations.ts`:
   - `setPhraseCode(id, code | undefined)` — validates via `validateCode`, sets `pinned: true` when setting a code.
   - `addManualPhrase` accepts optional `code` and `kind`.
   - `replaceAiPhrases` handles kinds: replaces AI rows of both kinds from `{ phrases, starters }` input; `dedupeAgainstPinned` applied per kind. **Assigns each incoming AI phrase a code via `generateCode`** (existing codes = pinned rows' codes + codes assigned earlier in the same batch; dictionary check injected). AI codes are replaced along with their rows on the next regen; pinning a phrase keeps its code durable.
   - `DEFAULT_SPACE_SEED`: add the starter-pack pinned rows with codes.
   - Tests: user code ⇒ pinned invariant; regen never touches pinned rows; regen replaces AI codes; AI codes never collide with pinned codes, each other, or dictionary words; per-kind replacement.
4. `lib/phrases.ts`: `topPhrases` variant that returns rows filtered by kind (`topRows(rows, n, kind)`), keeping `topPhrases` behavior for existing callers until Phase 3 rewires the stripe.

**Verify:** unit tests green; no UI change yet.

## Phase 2 — Code match in the stripe (`@/packages/suggestions` + composer)

**Files:** `hooks/use-stripes.ts`, `lib/stripes.ts` (+tests), `components/suggestion-stripes.tsx`, `types/index.ts`, `README.md`; take-handler in `routes/_app/spaces/-space-page.tsx`.

1. `Stripe` type gains `kind: 'phrase' | 'starter' | 'code'` and `code?: string`; `Suggestion['source']` gains `'code'`.
2. `use-stripes.ts`:
   - Load the user's coded rows across all spaces (query `savedPhraseCollection` unscoped; it's one local collection).
   - Compute trailing word of `text`; on `matchCode` hit, prepend a `kind: 'code'` stripe ranked above everything (deterministic — bypasses the LLM debounce path by construction).
   - Tests (hook or extracted pure helper): code row present iff trailing word matches; current-space precedence; no match mid-word.
3. `suggestion-stripes.tsx`: render gutter code chip + tinted tiles + solid `↵` for `kind: 'code'` rows (single indigo accent per DESIGN.md; `rounded-chip` tiles).
4. Take behavior: taking a code row replaces the trailing code word with the phrase text (existing reanchor/take machinery; the only new case is "consume the typed trigger"). Test: composer `"I made it, ty"` + take → `"I made it, Thank you"` (phrase's stored casing; sentence-start capitalization rule unchanged).
5. Verify in Notes mode: stripe keys off editor text — confirm no tiptap conflict (manual check via `/run` or existing tests).

**Verify:** `panel-rail`/stripe component tests green; manual: type `ty` in a space with the starter pack, phrase row surfaces instantly, tap swaps.

## Phase 3 — Starters: generation + stripe rendering

**Files:** `spaces/hooks/use-generate-space-phrases.ts`, `lib/phrases.ts` (prompt + tests), `suggestions/hooks/use-stripes.ts`, `components/suggestion-stripes.tsx`.

1. `buildPhrasesPrompt` / system prompt: request `{ phrases: 6–8 full first-person phrases, starters: 4–6 prefixes of 3–5 words }`. Zod schema for structured output updated accordingly. Existing starters embedded in the prompt like existing phrases (refine, don't re-derive).
   - Tests: prompt includes both sets; schema rejects starters > 5 words? (No — don't over-validate LLM output; clamp in code instead. Test the clamp.)
2. `use-sync-space-phrases` passes both sets to `replaceAiPhrases` (Phase 1 already handles kinds).
3. Stripe: when composer is empty, mix = top 3 phrase rows + 2 starter rows. Starter row renders dashed tinted tiles + `…` end key; taking `…` (or last tile) fills the composer with the prefix and completion continues — this is exactly the existing partial-take path, no new take logic.
   - Component test: starter row renders `…` key, no `↵`; mix respected when both kinds exist.

**Verify:** seed a fresh space (first message) → phrases *and* starters appear, each AI phrase carrying a generated code (typable immediately); pinned starters survive a forced regen; AI codes change with their rows on regen.

## Phase 4 — Phrases tab management UI

**Files:** `components/chat/right-panel.tsx` (+ its tests), `spaces/README.md`.

1. `PhraseRow`: render code badge on every coded row — filled chip for pinned, muted chip for AI-seeded (dashed "starter" badge for starters). Edit affordance to set/clear a code on a pinned row.
2. Add form: optional code input; on conflict, inline amber warning with the suggested mutation (from `validateCode`). Dictionary check wired to the loaded autocomplete trie (injected; falls back to allow when the trie isn't loaded yet).
3. Tests: adding phrase with code pins it; conflict warning shown for dictionary word; badge renders.

**Verify:** component tests green; manual add/edit round-trip.

## Phase 5 — Frequency mining (local, no LLM)

**Files:** `spaces/lib/mine.ts` (new, +tests), `right-panel.tsx` (Suggested group), small persistence helper.

1. Pure lib `mineShortcuts(messages, { existingPhrases, dismissed, isWord })` → ranked proposals `{ text, code, count }`:
   - Normalize; count exact repeats + maximal 3–8-word n-grams; score = count × keystrokes saved; thresholds count ≥ 5, words ≥ 3; age decay.
   - **Exclusions:** drop any candidate whose normalized text matches an existing phrase of either kind — pinned *or* AI-seeded (AI phrases already carry codes from Phase 1, so mining must not re-propose them) — and any dismissed hash. Proposal codes come from the shared `generateCode` (Phase 1) with all existing codes (pinned + AI) as the collision set.
   - Exhaustive unit tests — this is the TDD centerpiece (subsumption, thresholds, code collisions, exclusion of AI-seeded phrases, dismissed filtering).
2. Phrases tab: compute proposals via memo over `useMessages` (last ~300, user-type) when the tab renders; render in Suggested group with "typed N×" + prefilled code; **Keep** → `addManualPhrase({ code, pinned: true })`; dismiss → hash into `localStorage` dismissed-set.

**Verify:** unit tests green; manual: space with repeated messages shows a proposal; dismiss survives reload.

## Phase 6 — Per-space corpus seed (validate first)

**6a — Experiment (throwaway script, no app code):** feed ~100 generated sentences into the autocomplete engine (`@/packages/shared/lib/autocomplete`) on top of the base corpus; measure whether next-word predictions shift for space-specific vocabulary vs. drown user observations. Decide corpus size + weight cap (proposal: each sentence = 1 observation, seed layer capped below ~20 real messages' weight). **Go/no-go gate — findings to the notes file.**

**6b — Implementation (if go):**

- Generation call returns `{ phrases, starters, corpus: string[] }` (one structured call at seed; regen refreshes corpus only when `space.context` digest changed).
- `editor/hooks/use-autocomplete.ts`: new seeded layer — `observe` corpus sentences scoped by space id, persisted via `AutocompletePersistence` with a seed digest so re-opens are no-ops.
- Tests: digest short-circuit; seed layer capped; user messages unaffected.
- If WebLLM output proves unusable, corpus generation silently skips for local-only providers (note in concept doc).

## Docs & wrap-up

- Update `docs/concepts/saved-phrases.md`: codes (code ⇒ pinned), starters (`kind`), mining, stripe surfacing.
- Update READMEs: `spaces`, `suggestions`, `editor` (if Phase 6 lands).
- Keep `docs/notes/2026-07-18-phrase-codes-starters-corpus.md` current throughout (deviations, spec-silent decisions, 6a findings).
- Final gate: `pnpm -C apps/web lint && pnpm -C apps/web test && pnpm -C apps/web build`.

## Out of scope (recorded in mock)

Speak-on-take flag, fuzzy code matching, template slots, import/export, starter pick-rate personalization, Enter/Speak auto-take.

## Risks

- **Take-consumes-trigger** is the one genuinely new interaction in the stripe take path — isolate it as a pure text transform with its own tests before wiring.
- **Cross-space lookup** reads the whole phrase collection; trivial locally, but keep the memo tight so typing stays 60fps.
- **Corpus weighting** unproven — hence the 6a gate; Phases 1–5 ship value without it.
