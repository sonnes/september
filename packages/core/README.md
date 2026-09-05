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
fallbacks, related links, and search independent of a renderer.

`rules/backup.ts` owns version 2 of the portable backup contract. It validates
the full file before import, removes unknown fields, writes rows in a stable
order, and produces the file name and preview counts. The browser and desktop
tests read the same fixture from `rules/fixtures/backup-v1.json`. The parser
accepts version 1 with an empty Agent transcript and changes the retired
`camera` panel tab to `phrases` in older desktop files.

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
that value.

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

Run its checks from the repository root:

```sh
pnpm --filter @september/core test
pnpm --filter @september/core build
```

Core tests cover rule inputs, outputs, state changes, validation, and data
round trips. Catalog wording and visual presentation stay outside the suite.
