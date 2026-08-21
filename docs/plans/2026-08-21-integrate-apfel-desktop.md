---
title: Apfel-backed on-device AI for desktop
description: Add a Rust-owned apfel sidecar and expose local text generation through narrow Tauri commands.
---

# Apfel-backed on-device AI for desktop

## Goal

The desktop backend runs Apple Intelligence through a bundled apfel executable. React reaches it only through typed Tauri commands.

## Assumptions

- Apfel v1.9.1 is pinned for this integration.
- The bundled provider supports Apple Silicon Macs with macOS 26 or later.
- Unsupported systems report an unavailable status without preventing September from starting.
- The first API supports health checks and non-streaming text or structured generation.
- September does not fall back to a cloud provider inside the Rust backend.

## Implementation

1. Add failing Rust tests for apfel health and chat-completion responses.
2. Add a Rust client that validates requests and maps apfel responses into September-owned types.
3. Add a lazy sidecar manager that starts a private loopback server with bearer authentication.
4. Expose status and generation through Tauri commands.
5. Pin and verify the apfel release asset before Tauri development or packaging.
6. Update the desktop backend and on-device AI documentation.

## Completion criteria

- The WebView has no direct shell or loopback-network access to apfel.
- Rust reports whether apfel and the Apple model are ready.
- Rust returns generated text, finish reason, and token usage.
- The sidecar binds only to loopback and requires a per-process token.
- Mocked Rust tests pass without Apple Intelligence.
- A manual smoke test passes against the pinned apfel binary on a supported Mac.
- Desktop tests, builds, Rust tests, Clippy, and formatting checks pass.
