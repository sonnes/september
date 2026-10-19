# September core

This package owns platform-independent interaction rules and the autocomplete
engine. It does not import React, browser APIs, or Tauri APIs.

Import rules through explicit subpaths:

```ts
import { spaceSlug } from "@september/core/rules/spaces";
import { buildSuggestionPrompt } from "@september/core/rules/prompts";
import { presentChunks } from "@september/core/rules/present";
import { searchHelpGuides } from "@september/core/rules/help";
import { encodeBackup, parseBackup } from "@september/core/rules/backup";
import { askSpaceAgent } from "@september/core/rules/agent";
import { modelConfigFor } from "@september/core/rules/model-config";
```

`rules/present.ts` holds the presentation and export rules both apps read: the
seven tones, the chunking of a note, the font fit, the caption timing a video
needs, and why an artifact cannot be saved yet. See
`docs/concepts/note-present-export.md`.

`rules/help.ts` holds the task-based Help catalog shared by the browser and
desktop apps. It keeps guide slugs, category order, platform labels, written
fallbacks, related links, and search independent of a renderer. Alternative
tasks contain their own steps and outcomes. Search includes their titles and
steps. Screenshot metadata includes a caption, capture width, and optional
one-based step number. Images without a step number serve as screen overviews.

`rules/backup.ts` owns version 2 of the portable backup contract. An export
writes rows in a stable order and checks nothing. An import reads each setting
and row on its own, leaves out the ones with errors, counts them, and removes
unknown fields. Core also produces the file name and preview counts. The
browser and desktop tests read the same fixture from
`rules/fixtures/backup-v1.json`. The parser accepts version 1 with an empty
Agent transcript and changes the retired `camera` panel tab to `phrases` in
older desktop files.

Import converts the older `writingService` and `writingModel` fields to
`defaultModel`. A missing `suggestionsModel` defaults to null. This conversion
preserves the setup owner ID so restored rows remain visible.

`rules/agent.ts` owns the space-scoped Agent contract and loop. It validates
provider tool calls before a platform adapter receives them, runs read tools
immediately, persists write proposals for approval, and resumes the model
after the user applies or rejects a proposal. The tool schemas never accept a
space ID, and the executor creates saved-phrase codes itself.

The loop itself is `@earendil-works/pi-agent-core`. September builds an `Agent`
from the stored rows, runs it once, and throws it away; the transcript in
`agent_messages` is what lasts. Three hooks join the two. `subscribe` writes
every message that lands, and hands on the words of an answer while they are
still arriving. `beforeToolCall` is the permission gate: a read runs, a change
the user can see and undo runs, and a delete becomes a row that waits for a
press. `shouldStopAfterTurn` ends the turn when one is waiting.

`AgentWriter` is what an application lends the loop: the model, the client that
streams it, and somewhere to put what each answer spent. September owns the
transcript and the tools; the application owns the service and the key.

It also bridges the transcript to the typed model client each app uses.
`agentToolsForModel` gives the tools in the shape that client takes,
`modelContextFrom` rebuilds a history as its messages, and
`agentCompletionFromAssistant` reads one finished answer back. `modelTextFrom`
does the same for a call that wants only words. The shapes are declared here
structurally, so this package depends on no client, and a client that answers
a failure with a message rather than a throw is turned back into a throw at
this edge. `agentCompletionFrom` still reads a raw OpenAI-compatible reply,
which is what the local Apple sidecar returns.

A run may pass `onPartial`. The loop hands it the words of the answer being
written each time more arrive, always the whole answer so far, so a screen
sets what it shows and never has to join anything.

`rules/model-config.ts` selects the model settings for a text-generation job.
All jobs use `defaultModel`. If `suggestionsModel` is not null, Suggestions use
that value. The file also holds the curated model lists, `SUGGESTIONS_MODELS`
and `AGENT_MODELS`. `modelChoices` turns a list into rows: Automatic first, then
the Frontier and Open models groups.

`rules/voice.ts` holds the ElevenLabs voice models and the Expression presets.
`voiceModelFrom` reads the deprecated Turbo models as their Flash replacements.
`stabilityFor` snaps stability to the three Eleven v3 modes. `DIALOGUE_MODEL`
is the model of the Dialogue voice, and `dialogueParts` cuts a long text into
requests of at most 2,000 characters. `voiceRows`
groups the voice list into Yours, Heard lately, From the library, and
ElevenLabs voices, by `is_owner` and category, and
`heardVoices` keeps the last three voices heard.

The backup setup includes independent `autoSuggestions`, `autoPhrases`, and
`agentEnabled` booleans. Missing fields default to `true`. Explicit `false` values survive
export and restore. The parser rejects supplied values with another type.
The backup setup also holds the access profile. `parseAccess` checks each of
its fields, and a backup made before the profile gets the default profile.

`rules/access.ts` holds the access profile: the input method, the text size,
the contrast, the motion, the theme, the click sound, and an optional dwell
time and scan step. `reachFor` turns a profile into the target size, the gap,
the word size, the dwell, the scan step, the number of stripes, and the words
in a slice. `isDark` tells if the screen shows the dark theme. A dwell time or
a scan step is from `TIME_MIN_MS` (0.3 s) to `TIME_MAX_MS` (30 s). See
`docs/concepts/access-profile.md`.

`rules/spoken-word.ts` finds the word that a voice reads. `wordAt` gives the
place of the word that holds a character, and `wordsOf` cuts a text into words
and spaces. See `docs/concepts/spoken-word.md`.

It also holds how that work reads. `groupAgentTurns` folds the flat transcript
into turns, joining consecutive tools that share an outcome into one line,
because a user asked one question and not three. A change waiting for a press
never joins one, and neither does a failure, which carries its own reason. `agentToolOutcome`
names what became of a row in a word, so a screen never carries the outcome in
colour alone. `agentProposalLines` describes a pending write in the words of
the space, and shows what it replaces when the caller can say what that is.

`agentCallNeedsApproval` is the permission rule: only a delete waits for a
press. Everything else the agent writes is visible in the space the moment it
lands, so `AGENT_MAX_WRITES` is what bounds a turn instead — counted back to
the last thing the user said, since approving a change starts a fresh turn on
the same conversation.

It also holds how a space introduces itself. A run marked `intro` takes its
own system prompt, which tells it to name the space and write its first
phrases rather than offer to. `agentSaidRow` builds one plain turn, and `agentOwesReply`
tells a screen that work it did not start is still in flight.

`rules/panel.ts` keeps the Phrases and Voice tabs of the shared space rail,
including the tab and open state restored from settings.

`rules/titles.ts` writes what the browser tab says. `documentTitle` puts the
part that tells two tabs apart first and the name of the app last, because a
user often keeps one tab open per person they talk to.

Import autocomplete through `@september/core/autocomplete`.

`rules/note-document.ts` holds the line rules of the note editor: the kind of
a line, the style toggle, bold and italic marks, the sentence before the caret,
Delete last word, the prefix that Enter carries to the next line, a range
replace, and `notePreview`, the line that the list of notes shows under a name. The note stays plain Markdown, so the editor never parses it itself.

`rules/stripes.ts` matches individual history sentences and limits suggestion
slices to six unaccepted words. `stripeForText` takes a smaller limit from the
access profile. `matchTyped` finds a row that starts with the
draft, or a row that contains the draft at the start of a word. The rows that
start with the draft come first. A row that contains the draft hides no words,
so a press replaces the draft. Its `found` range marks the typed words, and its
slice reaches at least to them. Sentence boundaries also end a slice.
`tileScale` shrinks only the padding and the gaps of a tile, never below
`TILE_SCALE_MIN`. The word and the height of a tile stay at full size.
Punctuation and audio tags do not count toward the word limit. Each descriptor retains
the complete text and reports whether more words remain. `takeTokens` puts a
tag that came before the typed words at the start of the draft. The tags that
the user typed stay where the user typed them.

`rules/prompts.ts` takes an optional `document`, the note before and after the caret. With it, the user message holds the full note with a `<caret/>` mark in place of the conversation, and the system prompt holds the note rules. `rules/prompts.ts` also gives a draft of one or two words the search prompt. The
model then writes sentences about what the words refer to, and the words can be
anywhere in the sentence, or not in it. A longer draft gets the completion
prompt, and each row starts with the draft.

`rules/audio-tags.ts` decides which voice receives audio tags, and removes them
for every other voice. `rules/moods.ts` holds the five moods of Talk, with
their prompt instructions and example tags. See `docs/concepts/audio-tags.md`.

Run its checks from the repository root:

```sh
pnpm --filter @september/core test
pnpm --filter @september/core build
```

Core tests cover rule inputs, outputs, state changes, validation, and data
round trips. Catalog wording and visual presentation stay outside the suite.

Help directs OpenRouter users through browser authorization and ElevenLabs
users through API-key entry. Both flows start in the provider connection page.
