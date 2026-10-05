---
title: Notes — move the writing transport to the pi SDK
plan: ../plans/2026-09-02-pi-transport.md
date: 2026-09-02
---

# Notes

What the plan did not say.

## Decisions

- **`@september/core` declares the client shapes itself.** The bridge takes and
  returns structurally typed objects (`ModelTool`, `ModelContext`,
  `ModelAssistantMessage`) declared in `rules/agent.ts`. Core keeps no
  dependency. `ModelIdentity` and the message types are generic over the API
  and provider id, because the client narrows both to unions of its own names
  and a plain `string` would not be assignable. The cost is drift: a field pi
  changes fails an application build, never the core build.

- **`agentContextFrom` became `modelContextFrom`, and it no longer adds tools.**
  A plain `generate` call needs the same conversion without them, so the caller
  attaches `agentToolsForModel()` when it wants the model to act. The name lost
  its `agent` because both jobs use it now.

- **`onPartial`, not `onDelta`.** The plan named it `onDelta`. Each call gives
  the whole answer so far rather than the piece that just arrived, so a screen
  sets what it shows and never joins anything, and a turn that calls a tool
  starts its next answer over on its own. A name that said `delta` would have
  been a lie.

- **`cost_source` is `estimated`, not `measured`.** The client computes cost
  from the published rates in its catalog, and discards the dollar value
  OpenRouter reports in `usage.cost`. Price times tokens is an estimate, so it
  is recorded as one. `estimated` was already a `CostSource`, so no stored row
  changed shape. A model the catalog does not list records no cost at all
  rather than a zero that would read as free.

## Deviations

- **The retired Rust path went with the commands.** `Providers::generate` and
  `Providers::complete_agent` are gone, along with the `OpenRouterCompletion`
  response shapes and the two integration tests that covered the free-model
  fallback. `tests/proxy.rs` covers that behaviour now, because the proxy is
  where it lives.

- **Apple Intelligence still parses an OpenAI-shaped reply.** `apfel_generate`
  and `apfel_agent_generate` are unchanged, so `agentCompletionFrom` stays in
  core beside the new reader. The plan said Apple keeps its commands; this is
  the consequence.

- **The desktop calls Rust through `call()` now.** The old service used raw
  `invoke`. A Tauri command rejects with a string, and `apps/desktop/CLAUDE.md`
  says every command goes through `call()` so a screen reading `error.message`
  sees something. Fixed while rewriting the file.

## What the client cannot do, and what replaces it

Three things September needs have no option on the client, so they go through
the `onPayload` hook, which replaces the request body before it is sent:

| Needed                  | Why                                                  |
| ----------------------- | ---------------------------------------------------- |
| `response_format`       | JSON mode, for Suggestions and the space description |
| `parallel_tool_calls`   | The loop reads one call per turn and rejects two     |
| Removing an empty model | Lets the service, or the proxy, choose               |

The client also never sets `strict` on a tool definition, where the old request
did. Nothing regressed: `parseAgentToolArguments` already validates every
argument before a repository sees it. If loose arguments start being rejected
in practice, `onPayload` is where `strict` goes back.

## Measurements

Web `dist`, after:

| Chunk                   | Raw       | gzip     |
| ----------------------- | --------- | -------- |
| `openai-completions`    | 165.75 kB | 41.63 kB |
| pi core                 | 160.60 kB | 44.47 kB |
| `openrouter` catalog    | 150.61 kB | 10.89 kB |
| helpers, json-parse, esm| 27 kB     | 8.9 kB   |
| **loaded on first call**|           | **~106 kB** |

None of it is in the entry chunk: the built entry contains no `calculateCost`,
and the only matches for the client's name are the dynamic import specifiers.
That is well inside the quarter-megabyte the plan set as the point to
reconsider. A true before-and-after of the entry chunk was not taken; the
uncommitted Agent work means `HEAD` does not build, so there is no baseline to
build against.

## Not done

Streaming stops at the agent. `generate` still waits for the whole answer,
because nothing shows a suggestion or a phrase while it is being written.

## The loop moved onto the client too

A later decision reversed the plan's "adopt pi-ai only". `@september/core` now
depends on `@earendil-works/pi-agent-core` and no longer hand-rolls the turn.

- **Core took a runtime dependency.** It was that or two copies of the hardest
  code in the app, one per platform. The loop is a rule, so the rules package
  is where it belongs, and the dependency comes with it.
- **The agent is ephemeral; the transcript is not.** An `Agent` is built from
  `agent_messages`, run once, and discarded. Nothing of the client's state
  survives a turn, so a proposal that waits survives a quit, and an approval
  that arrives an hour later resumes by building a new one.
- **Three hooks, three jobs.** `subscribe` persists every message that lands
  and hands on the words while they arrive. `beforeToolCall` is the permission
  gate. `shouldStopAfterTurn` ends the turn when a change is waiting.
- **A blocked call writes no row.** `{ block: true }` makes the loop write a
  refusal for the model to read. The pending proposal row is the record the
  user acts on, so the refusal is dropped on the way to storage.
- **`prepareArguments` earns its place.** Apple Intelligence answers a schema
  with no properties by sending `[]` where it means `{}`. The hook coerces it
  rather than failing the turn.
- **Apple Intelligence goes through the proxy now.** Its sidecar streams and
  calls tools — both verified against the real binary — but it sets
  `cors: disabled, origin: localhost only`, so the WebView cannot call it. The
  proxy gained `/apple/v1/chat/completions`, and `apfel_agent_generate` is
  gone with `agentCompletionFrom`.

- **The loop loads with the first turn.** A static `import { Agent }` in
  `rules/agent.ts` put the whole client in the entry chunk, because every
  screen imports core: 943 kB became 1,187 kB. The import is dynamic inside
  `runTurn` instead, and the entry is 943,754 bytes again — 544 more than
  before this work, all of it September's own source.

Measured, browser bundle, `import { Agent }` on top of the pi-ai already
shipped: **+59 kB gzip**, of which the `Agent` and loop are 14.4 kB. The rest
is typebox's schema engine, `yaml`, `ignore`, and telemetry. It lands in a lazy
chunk, so only a user who opens Agent pays it.
