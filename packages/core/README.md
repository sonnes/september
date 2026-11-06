# September Core

This package holds the interaction rules and the autocomplete engine that the browser app and the desktop app share. It does not import React, browser APIs, or Tauri APIs.

Each rule module has its own import path. A folder under `rules/` is part of the path:

```ts
import { spaceSlug } from "@september/core/rules/spaces";
import type { Space } from "@september/core/rules/records";
import { askSpaceAgent } from "@september/core/rules/agent/loop";
import { presentChunks } from "@september/core/rules/present/chunks";
import { createEngine } from "@september/core/autocomplete";
```

## Stored Data

`rules/records.ts` holds the rows that both apps store and that a backup carries: `Space`, `Message` (one message of Talk), `Note`, `SavedPhrase`, and `AgentMessage`. It also holds `SpaceMode`, `PhraseKind`, `AgentRole`, and `AgentToolState`, with the lists `SPACE_MODES`, `PHRASE_KINDS`, `AGENT_ROLES`, and `AGENT_TOOL_STATES`.

`rules/settings.ts` holds the key of each stored setting. `PORTABLE_SETTINGS` holds the keys that a backup carries, and `PORTABLE_SETTING_KEYS` lists them. `DEVICE_SETTINGS` holds the keys that stay on one device. `talkDraftKey` and `talkMoodKey` give the device keys of the Talk draft and the Talk mood of one space. `LOCAL_USER` owns the rows when the system knows no login name.

`rules/backup.ts` holds version 2 of the portable backup. An export writes the rows in a stable order. An import reads each setting and each row separately. It removes unknown fields, leaves out the rows that are not valid, and counts them. The core tests and the app-ui tests read the version 1 fixture, `rules/fixtures/backup-v1.json`. The import reads two older forms of data:

- A version 1 file gets an empty Agent transcript.
- The old `camera` panel tab of an older desktop file becomes `phrases`.

A store keeps the settings of a backup as a map by setting key, in `StoredBackup`. `backupContentsFrom` makes that map into the typed settings of a backup, and `storedBackupFrom` makes the typed settings into the map. Each app stores the map as it is. `StoredSettings` types the map by the keys of `PORTABLE_SETTINGS`. The setup of a backup is a `SavedSetup` and its speech is a `SpeechSettings`.

An import also reads the older `writingService` and `writingModel` fields as `defaultModel`, and keeps the user ID of the setup. The `autoSuggestions`, `autoPhrases`, and `agentEnabled` fields of the setup are `true` when they are missing. `parseAccess` reads the access profile, and a backup without a profile gets the default profile. See `docs/concepts/portable-backups.md`.

`rules/time.ts` holds `DAY_MS` and `halfLifeWeight`, the decay that the phrase mining uses.

## Agent

The Agent of a space runs on `@earendil-works/pi-agent-core`. Each turn builds an `Agent` from the stored rows, runs it once, and then discards it. The rows in `agent_messages` are the transcript. See `docs/concepts/space-agent.md`.

| Module | What it holds |
|---|---|
| `rules/agent/tools.ts` | The tool schemas, `parseAgentCall`, the typed `AgentCall`, `agentCallNeedsApproval`, and the result types of the read tools. |
| `rules/agent/executor.ts` | `executeAgentRead` and `applyAgentWrite`, which run a call against the data of one space. |
| `rules/agent/loop.ts` | `askSpaceAgent`, `resolveSpaceAgentProposal`, `AgentWriter`, and `AGENT_MAX_WRITES`. |
| `rules/agent/transcript.ts` | How the transcript shows on a screen: turns, outcomes, summaries, and proposal lines. |
| `rules/agent/introduction.ts` | `agentOwesReply`, which tells a screen that a turn that it did not start is still running, and `replyOwedUntil`, which gives the time that the wait ends. |

The tool schemas never accept a space ID. The executor makes the codes of saved phrases. `parseAgentCall` makes sure that the arguments of a call are valid before an app receives them. A call with arguments that are not valid fails with its reason.

The loop uses three hooks of the `Agent`:

- `subscribe` writes each message as it arrives. It also gives the words of an answer to `onPartial`, which always receives the full answer so far.
- `beforeToolCall` runs a read immediately. A write runs immediately when the user can see it in the space. A delete, or a call with arguments that are not valid, becomes a proposal that waits for the user.
- `shouldStopAfterTurn` stops the turn while a proposal waits.

`AGENT_MAX_WRITES` limits the writes of one turn. The count starts at the last message of the user, because an approval starts a new turn in the same conversation. A turn with `intro` gets its own system prompt, which tells the model to name the space and write its first phrases.

`AgentWriter` is what an app gives the loop: the model, the client that streams it, and a place to record the cost of each answer. The app owns the service and the API key.

`rules/model-client.ts` connects the transcript to the typed model client of each app. `modelContextFrom` makes the stored history into the messages of the client, and `modelTextFrom` reads the words of an answer. These types are structural, so the package does not depend on a client. If a client returns a failure as a message, `modelTextFrom` throws the failure.

## Prompts

`rules/prompts/` holds the prompts that ask a model for text:

- `suggestions.ts` gives the suggestions of Talk and Notes. A draft of one or two words gets the search prompt, and the model writes sentences about the topic of the words. A longer draft gets the completion prompt, and each row starts with the draft. If the call gives a `document`, the user message holds the note with a `<caret/>` mark, and the system prompt holds the note rules.
- `phrases.ts` gives the prompt that writes the phrases and starters of a space.
- `agent.ts` gives the system prompt of the Agent.
- `parts.ts` holds the parts that more than one prompt uses. `audioTagsBlock` gives the audio tag rules as one section, and `promptOf` joins the sections.

`rules/audio-tags.ts` decides which voice receives audio tags, and removes the tags for each other voice. `rules/moods.ts` holds the five moods of Talk, with their prompt instructions and example tags. See `docs/concepts/audio-tags.md`.

`rules/model-config.ts` selects the model for a text job. `GenerationFeature` names the jobs. All jobs use `defaultModel`. If `suggestionsModel` is not null, the suggestions use that model. `withProvider` moves both models to a new provider. `SUGGESTIONS_MODELS` and `AGENT_MODELS` are the curated model lists. `modelChoices` makes a list into rows: Automatic first, then the Frontier and Open groups. `modelIdFor` gives the model id of a request: `openrouter/free` for Automatic, and the one model of Apple Intelligence. `OPENROUTER_BASE` is the address of the OpenRouter API. See `docs/concepts/writing-model-settings.md`.

## Phrases

`rules/phrases/` holds the saved phrases of a space. See `docs/concepts/saved-phrases.md`.

- `codes.ts` checks, generates, and matches phrase codes. A code is never a common word, so a typed word never brings up a phrase.
- `rows.ts` orders the rows for the stripe and the panel. Pinned rows come first, and a new set of phrases from a model never replaces a pinned row.
- `sync.ts` decides when a model writes the phrases of a space again, and cleans the starters that a model returns.
- `mining.ts` finds sentences that the user repeats, and proposes a phrase and a code for each one. The weight of a message halves every 90 days.
- `starter-pack.ts` holds the pinned phrases of a first space.

## Present and Export

`rules/present/` holds the rules that show a note one chunk at a time and export it. The live stage and the video frame read the same numbers. See `docs/concepts/note-present-export.md`.

- `stage.ts` holds the seven tones, the role of a chunk, and the font fit.
- `chunks.ts` divides a note into chunks and moves between them.
- `captions.ts` makes the words and the captions of a video from the timing that the voice returns.
- `export.ts` gives the name of a saved file, and the reason that an artifact cannot be saved yet.
- `settings.ts` reads the stored settings of Present.

## Help

`rules/help/catalog.ts` holds the task guides that the browser app and the desktop app show. Each guide has a slug, a category, platform labels, steps, written fallbacks, and related links. A screenshot has a caption, a width, and an optional step number. A screenshot without a step number shows the full screen. `rules/help/search.ts` finds a guide by slug, groups the guides for the Help home, and searches the titles and the steps. See `docs/concepts/help-system.md`.

## Navigation and Setup

`rules/navigation.ts` holds the pages of the app and the sections of Settings. A page that only one platform has names the capability that it needs in `requires`. `Capabilities` has three flags: `dashboard`, `eyeTracker`, and `floatingPanel`. `appNav` and `settingsNav` give the pages and the sections for a set of capabilities. `capabilityPaths` gives the paths of those pages that a platform offers. The file also holds the connection guides, `SPACE_MODE_TITLES`, `spaceRoute`, `modeForDigit`, and `openingPath`. `spaceRoute` reads the space and the mode from a path. `modeForDigit` gives the mode of ⌘⌥ and a digit, in the order of `SPACE_MODES`. `openingPath` gives the screen where the app opens: the saved path when it names a page or an existing space, else Talk of the last space, else the first page.

`rules/onboarding.ts` holds the setup draft, the steps, and the step rules. `savedSetupFrom` reads a stored setup and fills the fields of an older setup. `isSetupDone` is true when the setup has a name and a mode. `canReach` blocks a step after About you until the draft has a name. The draft holds the voice that setup offers. The saved setup does not hold it, because setup writes the voice to the speech settings. `setupVoices` gives the voice choices of setup, and `speechFromOlderSetup` gives the speech settings of a setup that named its voice service. `defaultServices` chooses the services that setup starts with: Apple Intelligence when it is ready, then a connected OpenRouter. A connected ElevenLabs speaks. A choice of the person stays.

`rules/services.ts` holds the name of each service, and `serviceName` gives the name of a stored service ID.

## Other Rules

- `rules/access.ts` holds the access profile. `reachFor` makes a profile into the target size, the gap, the word size, the dwell, the scan step, and the size of a stripe. A dwell time or a scan step is from `TIME_MIN_MS` (0.3 s) to `TIME_MAX_MS` (30 s). `steppedTime` gives the next time of a stepper, and `reachSummary` writes the profile in one line. See `docs/concepts/access-profile.md`.
- `rules/voice.ts` holds `SpeechSettings`, the stored sound settings, `DEFAULT_SPEECH`, the ElevenLabs models, their credit rates, and the Expression presets. `speechServices` gives the services that speak, with their names and descriptions. `cloudSound` gives the model, the stability, and the speed that a cloud voice speaks with, live or in a file. Both Eleven v3 models take three stability modes and have no similarity. `elevenLabsCredits` gives the credits of a text for a model. `voiceModelFrom` reads the old Turbo models as their Flash replacements. `dialogueParts` divides a long text into requests of at most 2,000 characters. `voiceRows` groups the voices. `voiceList` gives the grouped rows that a voice list shows for a search: the voices of the account, the stock voices that match a search, and the stock voices when the account has none of its own. `heardVoices` keeps the last three voices heard. See `docs/concepts/voice-expression.md`.
- `rules/voice-clone.ts` holds the size limits of voice samples. `validateVoiceClone` gives the first problem of a set of samples, or null.
- `rules/usage-summary.ts` adds up the usage events of a time range and writes them as CSV. `USAGE_RETENTION_MS` is how long a store keeps an event, and `usageSince` gives the boundary for a time. `sourceLabel` gives the word for a cost source. See `docs/concepts/desktop-usage.md`.
- `rules/stripes.ts` cuts history sentences into suggestion slices of at most six words. Punctuation and audio tags do not count. `stripeForText` takes a smaller limit from the access profile, and `matchTyped` finds the rows that match the draft. `tileScale` makes the padding and the gaps of a tile smaller, but never the word. `insertAtEnd` adds words at the end of a draft.
- `rules/stripe-rows.ts` builds the rows of the stripe from the starters and phrases of a space, the history, a typed code, and the rows of a model. A row that the user took from stays first while the draft follows it.
- `rules/keymap.ts` holds the keyboard shortcuts. A screen reads the label and the `aria-keyshortcuts` value from the binding that it handles.
- `rules/spaces.ts` holds the space slugs, the remembered space mode, new spaces, and the Talk transcript pages. The remembered mode is keyed by space ID, and `spaceModesById` moves a mode kept by slug to the ID of its space. `byRecent` puts the space changed last first. See `docs/concepts/space-navigation.md`.
- `rules/note-document.ts` holds the line rules of the note editor. The note stays plain Markdown. See `docs/concepts/space-notes.md`.
- `rules/panel.ts` holds the Phrases and Voice tabs of the space rail, and reads the stored tab and open state. `tierFor` gives the width tier of the floating panel.
- `rules/spoken-word.ts` finds the word that a voice reads. See `docs/concepts/spoken-word.md`.
- `rules/titles.ts` writes the browser tab title. The part that tells two tabs apart comes first, and the app name comes last.

## Autocomplete

`@september/core/autocomplete` gives the word completions and the next-word predictions of the composers. `createEngine` makes the engine, `suggestionsFor` gives at most `MAX_SUGGESTIONS` words, and `applySuggestion` puts a word into the text. See `autocomplete/README.md` and `docs/concepts/autocomplete-dictionary.md`.

## Checks

Run these commands from the repository root:

```sh
pnpm --filter @september/core test
pnpm --filter @september/core build
```

The tests examine the inputs, outputs, state changes, validation, and backup round trips of the rules. They do not examine catalog text or visual design.
