---
title: Iroh browser-to-desktop data sync
description: Research into using iroh as the encrypted transport between September's IndexedDB web app and SQLite desktop app.
date: 2026-09-02
package: core, app-ui, desktop, web
---

# Iroh browser-to-desktop data sync

## Recommendation

Use iroh as the encrypted peer-to-peer transport, not as September's database or conflict-resolution layer.

The browser should keep IndexedDB as its only durable application database. The desktop app should keep SQLite. A small Rust protocol shared by native Tauri code and a browser WebAssembly wrapper should exchange versioned September records and apply them through the existing repositories.

This is feasible if the first product can require the browser tab and desktop app to be online at the same time. Iroh relays are stateless and do not provide store-and-forward delivery, so a device that changes data while its peer is absent cannot leave those changes at the relay. Sync without overlapping availability needs a third, always-on sync peer or a conventional backend.

Do not make `iroh-docs` the canonical store in the first implementation. Its model is useful prior art, but its browser build does not supply an IndexedDB-backed persistent store. Using it directly would add a second database beside September's existing browser database and make atomic domain writes difficult.

## What iroh provides

Iroh gives the application:

- encrypted, authenticated QUIC connections identified by public-key `EndpointId`s;
- direct connections where the platform permits them, with relay fallback;
- application protocols selected by ALPN;
- Rust support on desktop and WebAssembly support in browsers; and
- optional higher-level protocols such as gossip, blobs, and documents.

Current iroh documentation says browsers are supported through WebAssembly. Browser endpoints cannot use direct UDP or NAT traversal, however, so every browser connection goes through a WebSocket relay. The connection remains end-to-end encrypted between the two iroh endpoints. Browser builds require iroh without its default features and an application-specific `wasm-bindgen` wrapper; there is no general-purpose browser npm package. The official examples demonstrate the same Rust protocol talking between a browser and a CLI, including a React/Vite chat example. See [WebAssembly browser support](https://docs.iroh.computer/languages/wasm-browser), [browser echo](https://github.com/n0-computer/iroh-examples/tree/main/browser-echo), and [browser chat](https://github.com/n0-computer/iroh-examples/tree/main/browser-chat).

An endpoint's secret key is its stable device identity. Iroh generates a new one by default, so September must persist it if paired devices are to recognize each other after a restart. Iroh authenticates the remote endpoint cryptographically, but the application still decides which endpoint IDs are authorized. Its endpoint hooks can reject an unpaired peer immediately after the handshake. See [Endpoints](https://docs.iroh.computer/concepts/endpoints) and [Endpoint hooks](https://docs.iroh.computer/connecting/endpoint-hooks).

### What iroh does not provide

Iroh is not a user account, an access-control policy, a durable mailbox, or a merge policy for September's records. In particular:

- Relays forward encrypted traffic but do not retain application data for an offline peer. See [Relays](https://docs.iroh.computer/concepts/relays).
- Gossip distributes live notifications among online peers; it is not a durable change log or backfill service. See [Gossip](https://docs.iroh.computer/connecting/gossip).
- The browser blobs example explicitly uses an in-memory store, so it does not solve durable browser storage. See [browser blobs](https://github.com/n0-computer/iroh-examples/tree/main/browser-blobs).
- Transport authentication proves an endpoint owns a key. September must still pair, allow, revoke, and name devices.

## Why not use `iroh-docs` directly?

`iroh-docs` is a multi-author key/value document protocol. Entries are reconciled by author, key, and timestamp; values live in `iroh-blobs`; peers exchange ranges and announce changes through gossip. It also represents deletion markers. These are valuable design references for September's inventory exchange and tombstones. See the [Documents overview](https://docs.iroh.computer/protocols/documents) and [`iroh-docs` API documentation](https://docs.rs/iroh-docs/latest/iroh_docs/).

It is not currently a clean persistence fit:

- its persistent storage implementation is file-backed `redb`;
- its memory mode is not durable across browser reloads;
- the official browser blob example is memory-only; and
- its WebAssembly CI verifies compilation, not persistence or browser runtime behavior.

Putting the document store beside IndexedDB would create two owners for the same data. A note save could not atomically update both stores. A crash between the two writes could leave the visible note and the sync state inconsistent. Rebuilding documents from current IndexedDB values after every reload would also discard meaningful historical versions or manufacture new versions for unchanged data.

For a first version, adopt the useful protocol ideas without adopting the store: versioned keys, content hashes, range or paged inventory exchange, tombstones, and idempotent application.

## Proposed architecture

```text
Browser                                              Desktop

React screens                                        Shared React screens
     |                                                      |
TypeScript repository                                Tauri repository commands
     |                                                      |
IndexedDB: domain + sync records   <---- iroh ---->   SQLite: domain + sync records
     |                            encrypted QUIC             |
Rust/WASM iroh client             via relay          Native Rust iroh endpoint
```

The browser should initiate connections. This matches browser lifecycle constraints and lets the browser wrapper stay smaller: it needs to dial and synchronize, not operate as an always-available server. The desktop app runs a long-lived iroh endpoint and routes a September ALPN such as `september/sync/1`.

Use either a small length-prefixed `postcard` protocol or `irpc`. Iroh's RPC guidance uses bidirectional QUIC streams and recommends bounded, framed messages; `irpc` adds typed requests and streaming when both sides are Rust, as they are here. See [RPC protocols](https://docs.iroh.computer/protocols/rpc).

The WebAssembly module should expose a narrow interface to TypeScript:

```text
connect(ticket or endpoint address)
pair(one-time token)
sync(local inventory callback, incoming-record callback)
disconnect()
```

It should not know IndexedDB's domain schema. TypeScript remains responsible for reading and applying browser records, while Rust owns the connection, framing, serialization, size limits, and peer identity.

### Keep sync metadata in the existing databases

Add sync metadata to the same database that owns the domain rows:

- IndexedDB: `sync_records` and `sync_peers` object stores inside the existing `september` database.
- SQLite: equivalent tables in the existing desktop database.

Every local mutation must write the domain row and its sync record in one database transaction. Every incoming mutation must do the same. This preserves the existing "one native database" rule and prevents a successful user save from being invisible to sync.

A compact current-record shape is sufficient:

```text
record key     stable logical path, for example note/{note-id}/content
version        logical counter or hybrid logical clock + stable device ID
value          typed payload, or no payload for a tombstone
hash           hash of the canonical payload
```

Do not append one operation for every autosave. Notes currently save after a short debounce, so an immutable operation stream would grow rapidly. Instead, compact each logical field to its latest version while retaining tombstones and any explicit conflict copy.

The existing `updated_at` values should not be the sync authority. Wall clocks can be wrong, equal, or move backwards. Use a logical or hybrid logical version with the device ID as a deterministic tie-breaker.

### Synchronization session

One connection can run this sequence:

1. Authenticate the paired endpoint and negotiate the protocol/schema version.
2. Exchange a bounded, paged inventory of `(record key, version, hash)` values.
3. Compare inventories and request records that are absent, newer, or have a mismatched hash.
4. Stream bounded record frames in both directions.
5. Validate and apply each page transactionally and idempotently.
6. Exchange acknowledgements and update the peer's observed watermark.
7. Repeat if local writes happened during the session.

Never use an unbounded `read_to_end` for peer-controlled data. Limit frame size, record count per page, total session bytes, and decoded string/blob sizes before database writes.

For two devices, a full paged inventory is the simplest correct starting point. If the record count later makes that expensive, add prefix/range hashes similar to `iroh-docs` set reconciliation. That optimization does not need to be in the first version.

## Merge rules by September data type

Synchronization needs an explicit merge rule for every portable type.

| Data | Recommended rule |
| --- | --- |
| Talk messages | Immutable set union by UUID. The same UUID with different content is a protocol/data-integrity error. |
| Usage events | Immutable set union by UUID, with the existing 90-day retention applied locally. Do not resurrect expired events. |
| Spaces | Per-field last-writer-wins registers plus a space tombstone. A deleted parent suppresses late child records. |
| Notes | Per-field registers. Treat the note body as one field initially; if concurrent bodies differ, keep the winner and create a visible conflict copy from the loser. |
| Saved phrases | Per-field registers and tombstones. Model bulk AI replacement as one transaction/generation so half a replacement cannot arrive. A pinned user phrase must survive an AI replacement. |
| Settings | Per-setting registers, not one settings object, so an unrelated setting change does not overwrite another device's change. |
| Agent messages | Immutable message creation; mutable tool/content state uses field versions. Tool effects must be idempotent by tool-call ID. |

Last-writer-wins is acceptable for independent user edits only if it is deterministic and losing long-form text is recoverable. Collaborative character-by-character editing is a different feature. If simultaneous editing becomes a requirement, use a text CRDT such as Automerge or Yjs specifically for note bodies rather than extending this register protocol into an improvised text CRDT.

Hard deletes must become tombstones. Otherwise a device that missed a deletion will send its old row back and resurrect it. The simplest two-device policy is to retain tombstones indefinitely. A later garbage collector may remove one only after every paired peer has acknowledged a version newer than the tombstone, or after the peer has been explicitly revoked and removed from the acknowledgement set.

### Initial migration needs an explicit source

Existing rows have timestamps but no reliable sync lineage. If both devices already contain data, do not silently merge them as though their timestamps were comparable.

The first pairing should:

1. create a portable backup on both sides;
2. ask which device is the starting source;
3. replace or merge through the already-validated backup boundary according to that choice; and
4. seed sync records only after the initial state is settled.

If one side is empty, it can simply clone the populated side. This one-time decision avoids surprising duplicates and accidental loss during adoption.

## Pairing and authorization

Persist one stable endpoint secret per installation:

- Desktop: store the endpoint secret in the macOS Keychain or another secure device-local store, not in the portable database or backups.
- Browser: store it as non-portable local sync state in IndexedDB. Browser JavaScript and a WASM module cannot provide Keychain-level protection, so the normal web threat model still applies.

A safe pairing flow is:

1. The desktop app creates a random, one-use, expiring pairing token and an endpoint ticket.
2. It shows a QR code and a copyable pairing link. Put the ticket in the URL fragment, not the query string, so normal server request logs do not receive it; clear the fragment after import.
3. The browser creates or loads its endpoint identity, dials a pairing ALPN, and proves knowledge of the token.
4. The desktop displays the browser device and asks the user to confirm.
5. Both devices store the other's endpoint ID; the desktop invalidates the token.
6. Future sync connections accept only allowlisted endpoint IDs on the sync ALPN.

Revocation removes the endpoint from the allowlist. Loss of either secret key makes that installation a new device and requires pairing again. Logs and diagnostics must exclude secret keys, tickets, one-time tokens, message text, note text, and provider credentials.

The UI must follow September's accessibility constraints: large targets, clear written status, no pairing action that requires fast typing, and no sync failure that blocks Talk, Speak, or local saves.

## Relay and deployment consequences

Because browser connections are relay-only, a production relay is a required service, not a rare fallback.

Iroh's public relays are intended for development and testing: they are shared, rate-limited, and do not provide a production SLA. Although content is end-to-end encrypted, relay operators can observe connection metadata such as endpoint IP addresses, timing, and traffic volume. Iroh recommends a dedicated relay for production and warns against using public relays for sensitive or confidential use cases. See [Public relays](https://docs.iroh.computer/iroh-services/relays/public).

September therefore needs one of these deployment choices:

- self-host an iroh relay and define its endpoint authorization policy; or
- use a managed dedicated relay with a server-side token broker.

Do not embed a relay project API key in the web bundle. Any browser can extract it. If the chosen relay requires bearer credentials, a September-controlled service must exchange an authenticated or pairing-scoped request for a short-lived relay token. A self-hosted relay can instead authorize endpoint IDs through an HTTP policy service, but bootstrap and revocation still need deliberate design.

This means "no cloud database" is possible, but "no operated internet service" is not realistic for reliable browser support.

### Offline behavior

With only the browser and desktop endpoints:

- local work always continues;
- changes synchronize when both are running and connected;
- closing the browser before the desktop appears leaves its changes in IndexedDB until the next overlap; and
- the relay cannot deliver those changes by itself.

If the product must sync while the two devices never overlap, add an always-on peer. That peer terminates iroh encryption and therefore sees plaintext unless September adds application-level encryption to the records. Once an account service, durable storage, recovery, quotas, and app-level encryption are required, a conventional sync backend may be simpler than treating the service as a hidden peer.

## Data scope

The first sync boundary should track the existing portable-backup boundary:

- profile and model/speech preferences;
- spaces;
- Talk and Agent messages;
- notes;
- saved phrases; and
- optionally usage events, subject to 90-day retention.

Keep these local-only:

- provider API keys;
- selected audio output and device paths;
- migration state;
- cached speech and audio files;
- endpoint secret keys;
- pairing tokens and peer authorization records; and
- the last-opened local path.

Whether transient UI state such as an open panel should move between devices is a product decision. The safer default is local-only even when a backup happens to carry it.

Large generated audio should not enter record sync initially. If audio transfer becomes valuable, exchange content-addressed references in the record protocol and transfer bounded blobs separately.

## Build and bundle findings

The current core API is iroh 1.x, while related protocol crates have independent pre-1.0 version numbers. Pin an exact, tested set across desktop and WASM rather than accepting broad compatible ranges. The current [`iroh` crate documentation](https://docs.rs/iroh/latest/iroh/) and [`iroh-docs` documentation](https://docs.rs/iroh-docs/latest/iroh_docs/) show that version split.

The upstream browser examples require a Rust-to-WASM toolchain, `wasm-bindgen`/`wasm-pack`, and Vite support for the generated module. On the local September development machine, a build of upstream `browser-echo` at commit `6a8cfcdccc6a633c5608cb25e776cb52fd509dd3` produced approximately:

- 2.88 MB raw WebAssembly;
- 2.61 MB after `wasm-opt`;
- 1.09 MB gzip; or
- 0.85 MB Brotli.

This is an indicative lower bound for a small transport wrapper, not a budget for the complete sync feature. Lazy-load it only on authenticated application routes or when the user enables sync so public and prerendered pages do not pay the cost.

The local build also exposed two reproducibility requirements worth recording in a spike:

- use a Rustup toolchain with `wasm32-unknown-unknown`, rather than assuming another installed Rust distribution has the target; and
- on Apple Silicon, `ring` may require LLVM Clang for the WASM target, while `wasm-opt` must have bulk-memory support enabled.

The latter is consistent with an [iroh browser build troubleshooting discussion](https://github.com/n0-computer/iroh/discussions/3200). These are build-pipeline details, not architectural blockers, but CI should prove them from a clean image.

## Suggested spike and rollout

### 1. Prove the transport

- Build an app-specific Rust/WASM package with iroh default features disabled.
- Run a native Rust endpoint in the Tauri backend.
- Use one custom ALPN and a public relay only for the spike.
- Persist both endpoint identities across restarts.
- Measure first-load size, connection time, reconnect behavior, and relay-only behavior in Safari, Chrome, and Firefox.

Success means the real browser app can send and receive one bounded typed frame with the desktop app after both restart.

### 2. Prove pairing and one immutable type

- Add one-use pairing and endpoint allowlists.
- Sync Talk messages by immutable UUID union.
- Verify duplicates, retries, disconnects, and revocation.

### 3. Add durable sync records

- Migrate the existing IndexedDB and SQLite databases with sync records and peers.
- Make local and remote domain-plus-sync writes atomic.
- Add paged inventories and backfill.

### 4. Add mutable fields and deletion

- Implement deterministic per-field versions.
- Add tombstones and parent-deletion rules.
- Preserve concurrent note-body losers as conflict copies.

### 5. Productionize the relay path

- Select self-hosted or managed dedicated relays.
- Implement relay authorization without a browser-embedded project secret.
- Add non-blocking status, retry, diagnostics, and accessible recovery UX.

## Test strategy

The sync reducer should be a pure package with property and example tests before repository or network code. It should prove:

- applying a record twice is the same as applying it once;
- arrival order does not change the final result;
- deterministic ties converge on both peers;
- tombstones prevent resurrection;
- a parent tombstone suppresses late children;
- expired usage events stay expired; and
- conflict copies preserve losing note bodies.

Repository tests should inject failures between domain and sync writes and prove the transaction rolls back. Protocol fixtures should be decoded by both native Rust and the compiled WASM package. End-to-end tests should cover a real browser and native endpoint through a relay, including reconnects, dropped/duplicated/reordered pages, clock skew, key loss, revocation, incompatible schemas, oversized frames, and relay outage.

The most important product invariant is that a network or sync error never prevents a local save, Talk, or Speak action.

## Decision

Proceed with a narrow transport spike if simultaneous-online sync is an acceptable first product constraint.

The preferred stack is:

- iroh core for encrypted endpoint-to-endpoint transport;
- an app-specific Rust/WASM browser wrapper;
- a native Tauri Rust protocol handler;
- a small framed `postcard` or `irpc` protocol;
- IndexedDB and SQLite as the respective canonical stores; and
- September-owned versioning, tombstones, conflict handling, pairing, and authorization.

Do not begin with `iroh-docs`, gossip-only synchronization, or blob snapshots. Reconsider the overall architecture before implementation if unattended/offline delivery is a hard requirement, because that changes the problem from peer synchronization into operation of a durable sync service.

