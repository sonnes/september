---
title: Space agent implementation notes
description: Decisions and deviations that arise during the space agent implementation.
date: 2026-09-02
plan: ../plans/2026-09-02-space-agent.md
---

# Space agent implementation notes

- The provider-neutral loop and mutation executor live in core behind a small
  repository adapter. Web and desktop therefore share proposal, approval, and
  current-space enforcement.
- The Agent composer hides the speech-oriented suggestion stripe. Its action
  is Ask, and no Agent path calls speech or records a spoken-message event.
- The desktop keeps the existing typed generation commands. Agent turns use a
  raw OpenAI-compatible request through fixed apfel and OpenRouter endpoints so
  tool calls can be preserved without changing existing writing features.
- IDs for created notes, phrases, and Talk messages derive from the durable
  proposal row. A repeated approval cannot create a second entity. Existing
  rows still use optimistic version or value checks before mutation.
- Portable backup version 2 adds Agent messages. Version 1 remains accepted and
  is normalized to an empty Agent transcript.
- Automatic OpenRouter Agent requests use the provider's `openrouter/free`
  router. A hard-coded fallback list became stale and returned HTTP 404, while
  the router filters the current free catalog for tool support.

## The transcript redesign (2026-09-02)

Decided from `docs/mocks/2026-09-02-agent-transcript.html`. Options A (new
space) and the two transcript treatments were approved as recommended.

- **The rule is the design.** Anything the user must act on is a card;
  everything else is a line. The first version gave a read, a delete, and an
  answer the same bordered card, so one question answered after three reads
  filled the screen with paperwork before the answer arrived.
- **The line is a `<details>`.** It announces its own expanded state and takes
  the keyboard without help, so the fold needed no ARIA of its own. The whole
  row is the control at 44px rather than a chevron beside a label — one reach,
  not two.
- **The agent reply lost its bubble.** Agent rows also moved from `text-sm` to
  `text-base`, which `DESIGN.md` already assigns to the bubble role and which
  Talk already followed. The Agent screen shipping at `text-sm` was drift.
- **`agentToolSummary` was not split.** The mock drew richer titles ("Create a
  pinned phrase") than the summary gives ("Create phrase"), but that function
  is also the `content` of the tool message sent back to the model. A second
  near-duplicate for display would drift from the one the model reads, so both
  use the same words and the outcome label supplies the tense.
- **Only `change_talk_message` carries a real before.** It is the one tool that
  checks the text it read, so its `expected_text` is the previous value. The
  screen passes the current name or note for `configure_space`; notes and
  phrases are named by ID, and looking each one up would make the transcript
  query the space it is describing. Deletes therefore show an excerpt only when
  the caller could supply one.

### The new space flow: the doorway

The create screen awaits three local writes — the space, the words as its
note, and a user turn in the transcript — and hands the user to that space's
Agent. The space then sets itself up on the agent's first turn.

- **The old reason for waiting was about Talk, not about waiting.** The screen
  held the user until every write landed so the suggestion stripe would not
  fill under a hand already reaching for it. Agent sets `suggestions={false}`,
  so landing there dissolves the constraint.
- **The first turn applies its own writes.** Approval protects what a space
  holds, and a new one holds nothing. `AGENT_INTRO_WRITES` bounds it (now `AGENT_MAX_WRITES`), counted
  from the transcript rather than a parameter, because `resolveSpaceAgentProposal`
  starts a fresh `continueSpaceAgent` with a fresh step count — a naive flag
  would have let a model propose for ever.
- **Auto-approve reuses `resolveSpaceAgentProposal` whole.** It already
  executes, settles the row, and continues the turn. The loop needed three
  lines, not a second code path.
- **The intro prompt reads before it writes.** `configure_space` requires the
  version the agent observed, so a blind write always failed the check. One
  extra `inspect_space` call was cheaper and safer than special-casing the
  check for new spaces.
- **Leaving mid-run no longer aborts.** The work is detached, so a user who
  moves on still pays for the calls in flight. That is the accepted cost of
  never returning to a half-made space.

Deleted with the old flow: `CreateProgress`, `createSteps`, `CreateStepId`,
`CreateStep`, `StepState`, `STEP_ORDER`, `STEP_LABELS`, `NO_SERVICE`, the
`running` and `skipped` line tones, the `made` retry state, "Open the space
anyway", the auto-open-on-success branch, `introductionReply`,
`SpaceIntroduction`, and `seedPhrases` in both apps.

`seedPhrases` went because the create screen was its only caller, and
`useSyncPhrases` already seeds a space that reaches Talk without phrases —
which is also the safety net when the first turn writes none.

### One guarantee is weaker

The old flow called `appendToNote(said, answer.context)`, so the user's own
words provably stayed at the top of the space's note and the model's
description went under them. The model writes the whole context through
`configure_space` now, so that is an instruction in the intro prompt rather
than something the app enforces. A test asserts the prompt says it; nothing
asserts the model obeys.

Making it a rule again would mean an append mode on `configure_space`, which
every other caller would have to ignore.

### The bug the mock comparison found

A read row's `content` is the **raw JSON the tool returned** — only a pending
write stores `agentToolSummary` as its content. The folded line was titled
`row.content`, so every read drew a JSON blob where its name should be. The
line is named with `agentToolSummary` now, and the raw result moved to a
bounded monospace block under the labelled list, which is what the mock's D3
asked for in the first place.

The render test did not catch it because its fixture gave read rows a tidy
`'Read this space'` content that the app never writes. Every read fixture
carries a real payload now, which is also what caught the next two problems.

### The fold opens onto words, not a payload

The mock's D3 said "prose keys, raw tail" — a labelled list over a monospace
block of the raw result. In the running app that block is a wall of JSON, so
the raw tail is gone. `agentToolResult` turns a payload into one sentence
instead: *1 note, 6 phrases, 2 recent messages*, or *Hospital visits — 40
characters, and more to read*. A result it does not recognise says nothing.

That leaves folds worth less than the press they cost, so only two things fold
now: a run of several tools, whose row promised the others, and the reason a
write did not land. Everything else says its piece on the row.

A single tool prints what it found, and its label would only have repeated the
title. A settled write prints its leading field — the phrase, the note name,
the space name — because a write that already happened is history, and the
fields it does not show are visible in the space itself. A rejection prints
nothing, because "Not applied" beside the mark already says it.

### Grouping runs, not just reads

`groupAgentTurns` first folded only consecutive *reads*, on the reasoning that
a write always deserves its own line. The first turn of a new space disproved
that: a rename and eight phrases is nine rows for one act. It groups
consecutive tools that share an **outcome** now — reads with reads, landed
changes with landed changes — so the word beside the mark still stands for
every row in the group. A pending change never joins one, and neither does a
failure, which carries a reason of its own.

The first turn of a new space is two rows: what it read, and what it changed.

One ordering bug came out of it. `agentToolResult` answers `"Done."` for any
`{ok:true}` payload, which is every applied write, so a run of phrases read as
five identical *Done.* lines. The change a write made says more than the fact
that it landed, so `agentProposalLines` speaks first and `"Done."` is only ever
a fallback.

`ToolLine` takes the detail as data rather than a `ReactNode`, which is what
lets the row decide. Handing it rendered JSX meant only the caller could know
whether there was anything behind the fold, and the caller is the wrong place
to decide how a row draws.

Three other things were off the mock and are now on it: the reply had no bot
mark in its gutter; the rail ran around the whole turn instead of only the
work, so a reply read as another thing the agent did; and the proposal card
had lost its 36px operation icon and its uppercase preview keys.

`Pairs` split back into the kv list and the card's `Preview`. Merging them in
the lazy pass was wrong — the mock draws them differently on purpose, one as a
quiet list inside a fold and one as bordered rows on a card.

### What the lazy pass cut

Reviewed after it worked, and five things were carrying no weight:

- **`callWithin`** — ten lines wrapping a call in a timeout. `AbortSignal.timeout`
  is native and does it in one argument.
- **`whyStopped` and `SpaceIntroduction.failed`** — the reason strings were
  computed carefully and never printed. `introductionReply` only tested them
  for truthiness, and `title === null` and `phrases === 0` already say the
  same thing. The reply now derives both.
- **`proposalNow`** — re-parsed tool arguments by hand to pick one of two
  fields. `agentProposalLines` takes the space and picks, because it has the
  parsed arguments already.
- **The `now`-for-deletes path** — notes, phrases, and Talk rows are named by
  ID, and no screen holds their text, so every caller passed nothing. Deleted
  with a `ponytail:` comment naming the upgrade.
- **`ReadDetail` and `ChangeLines`** — the same two-column list twice. Now one
  `Pairs`.

`Transcript` also takes the space rather than its title and note as separate
props, which it was reassembling into an object anyway.

### Test debt paid

`sharedRuleFiles` in `apps/desktop/tests/bootstrap.test.mjs` did not include
`agent.ts`, so the desktop suite could not read the agent rules at all. It can
now. Eleven new-space tests were repointed from `pages/spaces.tsx` to
`pages/agent.tsx`, and seven were rewritten because the behaviour they
described genuinely changed — not because the code moved.

The transcript itself is covered by `apps/web/src/agent-transcript.test.tsx`,
which renders the real components in jsdom rather than matching their source.

### The right rail stayed off Agent by mistake

Talk and Notes mount `PanelRail`; Agent did not. Agent is where the phrases
are written, so it is the one screen where seeing them matters, and a user
who approved a new phrase had to leave the conversation to read it. Same
block as the other two, and a phrase inserts into the Ask field the same way.

### Permission only for a delete

Every write used to stop the turn and wait for a press. It now applies as it
is made, and only a delete waits.

- **The press was buying nothing.** A phrase, a rename, a note the agent
  wrote is on the screen the moment it lands, and asking again undoes it. The
  press was a keystroke charged for something the user could already see and
  already reverse, in an app whose whole purpose is spending fewer of them. A
  delete is the one act with nothing left to look at afterwards, so it keeps
  its card and its second confirmation.
- **`agentToolNeedsApproval` split in two.** It answered one question with a
  name: read or write. Approval now depends on the *operation* in the
  arguments, not the tool, so `isAgentWriteTool` keeps the old meaning — it is
  what `backup.ts` validates rows with, and what the executor guards on — and
  `agentCallNeedsApproval(name, args)` is the new rule.
- **Unreadable arguments are not a delete.** The rule parses, and a call it
  cannot parse auto-applies and fails in the executor, where the model reads
  the reason and tries again. Failing closed would have put a card in front of
  the user for a call no press of theirs could fix.
- **The budget replaced the press as the brake.** Nothing else bounded a turn:
  the loop deliberately counts no steps, and the thing that used to stop it
  was a write waiting. `AGENT_INTRO_WRITES` became `AGENT_MAX_WRITES` and now
  applies to every turn, counted back to the last thing the user said rather
  than across the whole space — an all-time count would spend itself once and
  then ask for ever. Spending it does not throw; the next write asks, which is
  a brake the user can see and release.
- **A new question resets the budget.** `askSpaceAgent` seeds it at zero
  rather than from the transcript: the words the user has just typed are not
  stored yet, so the rows still end in the previous turn, and counting those
  would have made the eleventh phrase of a busy conversation ask for a press
  on a question that had written nothing. Asking again is the user saying
  carry on.
- **The intro stopped being a special case.** `options.intro` selects a prompt
  and nothing else now. The auto-approve branch and its all-time
  `appliedWrites` count are gone.

The model is told all of this: the ordinary system prompt names the single
exception, and the three change tools say so in their own descriptions, since
a model that believes it is proposing writes as though it were.
