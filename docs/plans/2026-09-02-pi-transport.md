---
title: Move the writing transport to the pi SDK
description: Replace the hand-written OpenRouter calls with @earendil-works/pi-ai, reached on the desktop through a loopback proxy that holds the key in Rust.
date: 2026-09-02
status: approved
---

# Move the writing transport to the pi SDK

## Outcome

Both apps reach the cloud writing service through one typed client instead of
two hand-written `fetch` bodies. The desktop keeps every key in the Keychain and
answers the WebView through a loopback proxy, the same shape Apple Intelligence
already uses. The agent turn streams, so the first words arrive while the rest
is still being written.

The agent contract does not change. Tools, proposals, approval, and the
transcript stay in `packages/core/rules/agent.ts`, and `@september/core` gains
no dependency.

## Decisions

- Adopt `@earendil-works/pi-ai` only. Do not adopt
  `@earendil-works/pi-agent-core`: its `beforeToolCall` hook blocks inside the
  loop, while September must persist a pending proposal, end the turn, and
  resume after an approval that may arrive in another session or the other app.
  Its session storage is a JSONL tree, not the `agent_messages` rows that
  backups and the space cascade already know.
- Pin `@earendil-works/pi-ai` to an exact version. The package is pre-1.0
  (0.84.4) and recently changed its npm scope.
- Route only OpenRouter through pi. Apple Intelligence keeps `apfel_generate`
  and `apfel_agent_generate` in this plan.
- Both apps adopt it. Leaving the browser on raw `fetch` would keep two
  transports and two sets of bugs. The browser loads pi lazily so the landing
  page and the prerendered guides do not carry it.

## Boundaries

- Keep `generate`, `completeAgent`, `writingService`, `hasWritingService`,
  `userContext`, and `describeSpace` exported from both `services/ai.ts` with
  today's signatures. No caller outside those two files changes in steps 1-4.
- Keep the free-model list and the model fallback in Rust. The browser keeps
  the `openrouter/free` default.
- The proxy binds the loopback only, serves one path, and requires a
  per-launch bearer token. A provider key never leaves Rust. The proxy token is
  a session token, not a key, so a command may return it.
- Write one `analytics` row per generation, with the fields
  `recordAiUsage` takes today. A dashboard reading old rows must not break.
- Do not widen the service list beyond `apple` and `openrouter`.
- Delete the retired path in the same change that replaces it. Do not leave a
  second transport behind a flag.

## Work

### 1. Bridge the tool contract in `@september/core`

`packages/core/rules/agent.ts` holds the OpenAI wire shape. pi takes a
different one, and the conversion is pure, so it belongs beside the contract
and not in either app.

- `agentToolsForModel()` maps `AGENT_TOOL_DEFINITIONS` to
  `{ name, description, parameters }`. A pi `Tool.parameters` is a TypeBox
  schema, which is a JSON Schema object at runtime, so the existing schemas
  pass through unchanged.
- `agentContextFrom(messages)` maps `AgentProviderMessage[]` to
  `{ systemPrompt, messages }`: the `system` row becomes `systemPrompt`, an
  `assistant` row with `tool_calls` becomes content parts, and a `tool` row
  becomes a `toolResult` message.
- `agentCompletionFromAssistant(message)` maps a finished pi assistant message
  back to `AgentCompletion`, joining text parts, taking the first tool call,
  and reading `usage.cost.total` for `costUsd`. It validates arguments with
  `parseAgentToolArguments`, exactly as `agentCompletionFrom` does now.

Keep `AgentProviderMessage` as the adapter contract. Core stays free of pi.

### 2. Add the loopback writing proxy to the desktop backend

New `apps/desktop/src-tauri/src/proxy.rs`, modelled on `apfel.rs`: bind
`127.0.0.1:0`, mint a UUID token for the run, hold the address in state, and
start on first use.

- One route, `POST /v1/chat/completions`, and its `OPTIONS` preflight. Reject
  every other path and method.
- Require the run token in `Authorization`. Replace it with the OpenRouter key
  from the Keychain cache before forwarding.
- Insert the `OPEN_ROUTER_MODELS` fallback array when the body names no model,
  which is what `providers.rs` does today.
- Stream the upstream body through untouched, so `stream: true` works without
  the proxy understanding SSE.
- Answer the WebView origin with the CORS headers the request needs
  (`authorization`, `content-type`, `POST`). The OpenAI client sends an
  authorization header, so the preflight is not optional.
- New command `writing_proxy` returns `{ base_url, token }`.

Cargo gains `axum`; `tokio` gains `net` and `rt-multi-thread`. Write the CORS
headers by hand rather than adding `tower-http`.

### 3. Point the desktop writing service at pi

In `apps/desktop/src/services/ai.ts`:

- Build a `Models` collection once, with a provider from `createProvider`:
  id `openrouter`, `baseUrl` from `writing_proxy`, `api: openAICompletionsApi()`,
  and auth that resolves the run token.
- Build the `Model` object from the id the user chose in Settings, so a model
  that pi's static catalog does not list still runs. Use
  `provider_writing_models` as the `refreshModels` source.
- `generate` and `completeAgent` call `models.complete`, convert through the
  step 1 helpers, and record usage from `usage.input`, `usage.output`,
  `usage.totalTokens`, and `usage.cost.total`. A model id ending in `:free`
  still records a zero cost.
- Apple Intelligence keeps its two commands and its branch.

Delete `openrouter_generate` and `openrouter_agent_generate` from `rpc.rs` and
`lib.rs`, and the request path in `providers.rs` that only served them. Keep
`provider_connect`, `provider_status`, `provider_models`,
`provider_writing_models`, and `provider_voices`.

### 4. Point the browser writing service at pi

In `apps/web/src/services/ai.ts`, build the collection from
`createModels()` and `openrouterProvider()`, and pass the key from
`providerKey('openrouter')` as `apiKey` in the call options. The key stays in
IndexedDB and reaches nothing else.

Import pi inside the functions that use it, not at the top of the module, so it
lands in the agent chunk rather than the entry bundle. Record the entry-bundle
size before and after in the notes file, and keep the entry bundle unchanged.

### 5. Stream the agent turn

- `AgentRunOptions` gains `onDelta?: (text: string) => void`, and
  `AgentRuntimeAdapter.complete` takes it through its options argument. The
  bounded loop in `askSpaceAgent` and `continueSpaceAgent` passes it down and
  is otherwise untouched.
- Both services call `models.stream()` and forward `text_delta`. The finished
  message still goes through `agentCompletionFromAssistant`, so a stopped
  stream and a finished one end in the same place.
- `packages/app-ui/blocks/agent-transcript.tsx` draws the growing row and
  replaces it with the stored row when the turn ends. Announce the finished row,
  not each delta: a screen reader must not read a word at a time.
- Apple Intelligence stays whole-answer. `apfel.rs` sets `stream: false`.

### 6. Update concepts and module documentation

- `docs/concepts/desktop-providers.md`: the proxy, the run token, and where a
  key now stops.
- `docs/concepts/space-agent.md`: the streamed turn.
- `docs/concepts/writing-model-settings.md`: where the model list comes from.
- `apps/desktop/README.md`, `apps/desktop/src-tauri/README.md`,
  `apps/web/README.md`, `packages/core/README.md`.
- Keep `docs/notes/2026-09-02-pi-transport.md` current as the work runs.

## Test order

Write each test before its implementation.

1. Core: tool mapping, context mapping in both directions, tool-call
   validation, and usage and cost extraction. `packages/core/rules/agent.test.ts`.
2. Rust: the proxy rejects an unknown path, a missing token, and a wrong token;
   it injects the key and the fallback models; it passes a streamed body
   through. Use a stub upstream, as `tests/providers.rs` does.
3. Desktop service: `apps/desktop/tests/` covers the model built from a chosen
   id, the usage row, and the error message for a model without tools.
4. Browser service: extend `apps/web/src/services/ai.test.ts` for the same
   three, with a faux provider rather than a network call.
5. Streaming: the loop forwards deltas, an aborted stream records a failed
   usage row, and the transcript row is replaced once.
6. Bundle: assert the web entry chunk does not import pi.

## Required checks

```sh
pnpm --filter @september/core test
pnpm --filter @september/core build
pnpm -C apps/web test
pnpm -C apps/web lint
pnpm -C apps/web build
pnpm -C apps/desktop test
pnpm -C apps/desktop build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
```

## Risks

- **Pre-1.0 dependency.** 0.84.4, one maintainer, a recent scope change from
  `badlogic/pi-mono` to `earendil-works/pi`. Pin the exact version and keep the
  conversion in core, so a break is confined to two files.
- **Strict tool schemas.** Today every definition carries `strict: true`. If
  pi's OpenAI implementation drops it, models will return looser arguments.
  `parseAgentToolArguments` already rejects those; if the rejection rate rises,
  re-add the flag through the `onPayload` hook.
- **Browser weight.** pi reaches OpenRouter through the `openai` SDK. The lazy
  import keeps it off the entry bundle, but the agent route gets slower to open
  on a poor connection. Measure it; if the agent chunk grows past a quarter of
  a megabyte, reconsider step 4 and leave the browser on `fetch`.
- **A listening socket.** The proxy adds one to the app. The loopback bind, the
  run token, and the single route hold it down, and `apfel` already runs one.

## Not in this plan

Other providers, Apple Intelligence through pi, prompt caching, compaction, and
image input. Each is reachable once the transport lands.
