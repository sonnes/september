# Automatic Suggestions and Phrase Generation

Status: Implemented. Validation results and limits are in the matching implementation notes.

## Scope

The web and desktop apps will have independent switches for automatic AI suggestions and automatic phrase generation.
Only AI suggestions will wait for a space or punctuation. Local word completion will continue after each letter.

The proposed defaults keep both switches on for new and existing users. The settings apply across spaces.
Model choices remain separate from these switches. The native macOS keyboard is outside this plan.

## Settings Behavior

Writing settings will contain these controls:

| Control | Saved Field | Behavior When Off |
| --- | --- | --- |
| Automatic AI suggestions | `autoSuggestions` | Stops automatic suggestion requests and clears generated suggestion rows. |
| Automatic phrase generation | `autoPhrases` | Stops automatic creation and refresh of phrases and starters. |

Existing phrases remain available after automatic phrase generation stops. Pinned phrases, phrase codes, history matches, and local word completion remain usable.
Explicit Agent requests to create or edit phrases remain available.

Each switch saves independently through the existing setup service. A failed save shows an error and restores the saved value.
The controls use existing settings components and the accessibility rules in `DESIGN.md`.

Older saved setups and backups default missing fields to `true`. Explicit `false` values survive reload, export, and restore.
The backup parser validates supplied values as booleans. No database schema change is expected because both apps store setup as a settings value.

## AI Suggestion Trigger

The proposed trigger uses the composer text after an edit. Nonempty text must end in whitespace or one of `. , ! ? ; :`.
Whitespace includes spaces and line breaks. Apostrophes and hyphens do not trigger requests inside words.

| Text After an Edit | Request |
| --- | --- |
| `hello` | No |
| `hello ` | Yes, after the existing 200 ms delay |
| `hello,` | Yes, after the delay |
| `hello w` | No |
| Empty or whitespace-only text | No |

Paste and suggestion insertion use the same text rule. Deletion qualifies only if the resulting text meets the rule.
Restored drafts do not trigger requests until an edit occurs. Opening a space or clearing the composer does not generate AI starters.
Saved starters remain available.

Each edit cancels the pending timer and invalidates the previous request. Ineligible text clears generated rows.
Late responses and errors cannot replace results for newer text or a different space.
Space changes and settings changes invalidate pending work. Enabling suggestions waits for the next qualifying edit.
An unavailable writing service prevents requests even with the switch on.

## Phrase Generation

Both platform implementations of `useSyncPhrases` will read `autoPhrases` before a request.
The existing schedule remains: initial generation after context or the first message, then refresh after six additional messages.
Turning the switch off cancels pending work where supported and prevents late results from updating phrases or the sync count.
Turning it on evaluates the existing schedule for the current space. It does not reset the sync count.

## Implementation Sequence

1. Add failing tests for independent settings, legacy defaults, and backup round trips.
2. Extend setup types and defaults in both apps, setup loading, and the shared backup contract.
3. Add failing interaction tests for independent switches and failed saves.
4. Add the controls to `packages/app-ui/pages/settings.tsx` through the existing setup service.
5. Add failing tests for suggestion timing, text boundaries, restored drafts, cancellation, and late responses.
6. Update `packages/app-ui/blocks/suggestions.tsx` and pass edit state from the composer only where necessary.
7. Add failing tests for phrase generation, disabled persistence, and resumption on both platforms.
8. Update `apps/web/src/services/phrase-sync.ts` and `apps/desktop/src/services/phrase-sync.ts`.
9. Update affected module READMEs, Help guidance, and the writing-settings and saved-phrases concept documents.

For each step, run the failing tests before implementation. Add only the code needed to make those tests pass.
Tests cover request counts, saved values, phrase writes, and accessible control state. They do not assert visual styles or exact prose.

During implementation, record deviations in `docs/notes/2026-09-23-generation-settings.md` with a frontmatter link to this plan.
Coordinate edits to the suggestion component with the active `2026-09-23-suggestion-slices.md` plan.

## Validation

Run core tests and type checks, web tests/lint/build, and desktop tests/build.
Manually verify switch persistence and focus behavior in both apps.
Verify all switch combinations with a connected provider and with no provider.
Verify that late generation results cannot apply after a switch turns off or the active space changes.
