---
title: Add an agent to every space
description: Add a space-scoped agent that can propose changes to spaces, notes, phrases, and Talk messages.
date: 2026-09-02
status: approved
---

# Add an agent to every space

## Outcome

Every space gets an **Agent** mode beside Talk and Notes. The user can ask the
agent about the current space or ask it to change space settings, notes, saved
phrases, sentence starters, and Talk messages.

The agent can read current-space data immediately. Every write stays pending
until the user approves it. Agent conversation and tool records live in their
own storage, so they never appear in Talk history or influence autocomplete,
phrase generation, speech, or usage totals.

## Boundaries

- Bind every tool invocation to the open space. Tool input never accepts a
  `space_id`.
- Let the agent create, edit, and delete user-authored Talk transcript rows.
  These changes do not speak text or alter recorded audio.
- Generate saved-phrase codes in the executor. The model cannot choose codes.
- Keep API keys on the device and preserve the existing free-model policy.
- Run one tool call at a time and cap each agent turn.

## Work

1. Add the pure agent contract to `@september/core`.
   - Add Agent to the remembered space modes and composer actions.
   - Define agent transcript rows, tool names, strict argument schemas, and
     proposal states.
   - Validate model tool arguments before a repository can receive them.
2. Add separate agent persistence.
   - Add `agent_messages` to IndexedDB and SQLite with a space-and-time index.
   - Cascade agent rows when their space is deleted.
   - Include agent rows in version 2 portable backups while accepting version
     1 backups with an empty agent transcript.
3. Add current-space repository tools.
   - Read space details, note content, phrases, and paged Talk messages.
   - Configure space fields with optimistic concurrency checks.
   - Create, append, replace, rename, and delete notes.
   - Create, edit, pin, unpin, and delete phrases and sentence starters.
   - Create, edit, and delete user-authored Talk transcript rows.
   - Mark phrase generation stale after a Talk edit or deletion.
4. Add tool-capable provider calls.
   - Send strict tool definitions through OpenRouter and the local apfel server.
   - Parse one tool call, execute automatic reads, and return tool results.
   - Persist write proposals before approval and resume the turn after the user
     applies or rejects them.
   - Reject incompatible models with an actionable error.
5. Add the shared Agent screen.
   - Add `/spaces/$slug/agent` to the web and desktop route graphs.
   - Add Agent to the space dock and preserve it when switching spaces.
   - Reuse the shared composer with an **Ask** action and local autocomplete.
   - Render agent history separately from Talk and show pending write cards.
   - Use an inline approval for ordinary writes and destructive confirmation
     for deletes.
6. Update concepts and module documentation.

## Test order

Write each test before its implementation.

1. Core mode, transcript, schema, and validation tests.
2. Browser and SQLite persistence, cascade, and backup tests.
3. Repository tool and optimistic-concurrency tests.
4. Provider serialization, parsing, and bounded-loop tests.
5. Shared screen, route, navigation, and accessibility tests.
6. Cross-platform builds and lint checks.

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
