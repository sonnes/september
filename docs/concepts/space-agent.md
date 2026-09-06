---
title: Space agents
description: Each space has a separately stored Agent conversation whose scoped tools read immediately and require approval before changing space data.
package: core, app-ui, desktop, web
---

# Space agents

Agent is the third mode of a space, beside Talk and Notes. A user asks about
the open space or requests a change. The Agent can inspect that space, but it
cannot name or reach a different space through tool input.

## Keep the conversation separate

Agent prompts, replies, tool calls, and tool results use `agent_messages`.
They do not enter the Talk transcript. Autocomplete, phrase generation,
speech, and spoken-message usage totals therefore read only Talk data.

Deleting a space also deletes its Agent conversation. Portable backup version
2 includes Agent messages. A version 1 backup restores an empty Agent
conversation.

## Give tools narrow jobs

| Tool | Reads or changes |
| --- | --- |
| `inspect_space` | Space details, note list, phrases, and recent Talk messages |
| `read_note` | One bounded note chunk |
| `read_talk_messages` | One bounded page of user-authored Talk messages |
| `configure_space` | Space name or description |
| `change_note` | Create, append, replace, rename, or delete |
| `change_phrase` | Create, edit, pin, unpin, or delete a phrase or starter |
| `change_talk_message` | Create, edit, or delete a user-authored Talk row |

Read tools run immediately, and so does every change except one. A delete
creates a durable pending proposal, stops the turn, and waits: the user
approves or rejects the exact proposal, then confirms it a second time,
because a delete is the one act that leaves nothing behind to look at.
Everything else the agent writes is visible in the space the moment it lands
and can be changed again by asking, so a press for each one buys nothing and
costs the keystrokes this app exists to save.

A pending proposal is not only a delete, though. A turn that spends its whole
budget asks before the next write too, whatever it is, and an unpin proposal
explains that a later generation can replace the phrase.

## Show the work as a footnote

Anything the user must act on is a card. Everything else is a line. There is
no third weight.

A tool call is one row, 44 pixels tall, in the gutter of the reply it
produced. Tools that ran one after another with the same outcome share a
single row: a user asked one question, and the reads behind the answer — or
the phrases written into a new space — are one act, not six. A change still
waiting for a press is always its own piece, and so is one that failed,
because it carries a reason of its own.

A row says what the tool found or changed in its own words — never the
payload the model read. That fits on the row: *Read this space · 1 note, 6
phrases, 2 recent messages*, or *Create phrase · Are the children well?*. A
settled write is history, so its row names what changed and leaves the rest of
the fields to the space, where the change actually landed.

Two things do not fit, and only those two fold: a run of several tools, whose
row promised the others, and the reason a write did not land. A control that
opens onto one sentence is a press the user did not need to make.

So a new space setting itself up is two rows — what it read, and what it
changed — over a reply that says the same thing in words.

Every row says what became of it in a word — Read, Applied, Not applied, or
Could not apply — so the outcome is never carried by colour alone.

Describing a row is not running it. A call the executor refused keeps the
arguments the model sent, because that row is the record of what was tried, and
those arguments are by definition ones the validator rejects. `agentCallInput`
is what a description reads them with: it validates when it can and falls back
to the raw object when it cannot, and it never throws. The executor keeps its
strictness — every field a description reads is checked for its own type
anyway, so a field it cannot validate is one the row leaves out. Validating
while drawing would throw during render, and one refused call would take down
every visit to the space that holds it.

A pending write is the only card. It shows what the change would write beside
what it would replace, so approving does not mean opening a second screen to
compare. The agent's reply is text on the surface, not a second bubble: the
agent is the app answering a question about this space, not another person in
the conversation.

## Make a space by starting its conversation

A space exists from the press that asked for it. Nothing is asked first: a
user who types slowly should not have to write a paragraph before September
will give them somewhere to write it. The space is made empty, named `Untitled`
— and `Untitled 1`, `Untitled 2` for the ones after it — and opens in Agent — or in Talk, when no writing service is connected and
there is nothing that could ask.

A space with no description and an empty transcript has still to be set up.
`spaceNeedsSetup` is that state, and Agent wears it: the empty transcript shows
the question and the pressable openers, and the composer runs with the
suggestion stripe on, reading `NEW_SPACE_CONTEXT` and the words the user has
written in every other space.

The first thing said in such a space is its setup. The words become the space's
description before a model reads them, so a service that never answers still
leaves a space that says what it is for. Then the turn runs under the
introduction prompt: it reads the space, names it with `configure_space`,
writes its description, and writes its first phrases with `change_phrase`.
These are ordinary tool calls in the ordinary transcript.

That turn writes without asking, like every other turn, and `AGENT_MAX_WRITES`
bounds it — one call to name the space and the rest for phrases. Past the
budget the turn asks before the next write.

The model still does not decide *whether* to create, and the checks that
protect a space still run: `configure_space` carries the version the agent
read, and a title another space already holds is refused. The user's own words
staying at the top of the context is an instruction in the prompt, not a rule
the app enforces.

The setup turn is a chain of calls, not one, so it is bounded by
`INTRODUCTION_WAIT_MS` rather than by an ordinary wait. A screen showing a
transcript knows work is in flight because the newest turn is a question with
no answer, which is also how a turn left running survives the screen that
started it.

Naming the space changes its slug, and the user is watching that happen from
inside the space. `spaceForSlug` is why they stay: a screen says which space it
was already showing, and the address follows the rename instead of reading as a
stale link.

A user who has nothing to say yet says nothing. The space keeps its default
name until they do, and Talk seeds its phrases when they arrive, the same as
for any space that reaches it without phrases.

## Apply changes safely

The runtime binds every call to the open space; tool schemas do not contain
`space_id`. Existing spaces, notes, and phrases carry the version observed by
the Agent, and Talk changes carry the observed text and timestamp. Approval
fails when that state changed in the meantime.

A turn runs until the model stops asking for tools, a delete needs a press,
the budget runs out, or the caller stops it. Nothing counts the steps: a read
costs the user nothing, and a turn cut off part-way through looking is a turn
that answers from half of what it needed.

`AGENT_MAX_WRITES` is what a press used to be. A write no longer stops the
turn, so without a budget nothing would stop a model that keeps writing. It is
counted back to the last thing the user said, because approving a change
starts a fresh turn on the same conversation and a carried flag would reset
with it. A new question starts at zero: the words the user just typed are not
stored yet, so counting the rows would charge them for the turn before. Spending it does not throw — the next write asks, which is a brake
the user can see and release.

The model cannot assign phrase codes. The executor generates a valid code as it
applies a phrase create or edit. Agent changes to Talk rows update
the transcript only. They do not speak, create audio, or count as a sent
message.

Web and desktop use the same loop and validated tool contract from core. OpenRouter and the local apfel service receive one tool call at a time.
The Automatic OpenRouter choice uses `openrouter/free`, which filters the live
free catalog for models that support the tools in the request. An incompatible
named model returns an actionable error instead of bypassing the approval path.

The loop is `@earendil-works/pi-agent-core`. September builds an agent from the
stored rows, runs it once, and throws it away; the transcript is what lasts.
Three hooks join the two: one writes every message that lands, one decides
whether a tool may run, and one ends the turn when a change is waiting.

Both apps reach their service through one typed client. The browser calls
OpenRouter with the key it holds; the desktop calls the loopback proxy that
keeps its key in Rust, and reaches Apple Intelligence the same way, because the
sidecar answers a loopback origin only.

## The answer arrives while it is written

A turn streams. The words of an answer reach the screen as they arrive, and
the stored row replaces them when the turn ends. The growing text is hidden
from a screen reader on purpose: reading an answer a word at a time would talk
over a user for as long as the model keeps writing, so only the finished row
is announced. A turn that calls a tool starts its next answer over.
