# September Mac

Native macOS prototype for September. This package currently boots the Type-mode foundation: a basic QWERTY accessibility keyboard shell with an internal text buffer, suggestion chips, and large key targets.

## Requirements

- macOS 14+
- Swift 6+
- macOS Command Line Tools

## Run

```bash
swift run SeptemberMacApp
```

## Verify

```bash
swift build
swift run SeptemberMacLayoutTests
```

`SeptemberMacLayoutTests` is a small executable test harness because this checkout only has Command Line Tools, not full Xcode XCTest support.

## Structure

```text
Sources/SeptemberMac/
  Keyboard/KeyboardLayout.swift        # QWERTY layout domain model
  Keyboard/SeptemberKeyboardView.swift # SwiftUI keyboard shell
Sources/SeptemberMacApp/
  SeptemberMacApp.swift                # App entry point
Tests/SeptemberMacLayoutTests/
  main.swift                           # Layout contract checks
```

## Current Scope

- In scope: basic QWERTY layout, local text composition, suggestions, Speak button placeholder.
- Not yet in scope: floating `NSPanel`, system-wide CGEvent key injection, app-aware shortcuts, AI predictions, TTS.
