# September for macOS — Product Overview

September for macOS is a native assistive communication app for people with ALS, MND, or other speech and motor difficulties. While the September web app serves this purpose in the browser, the macOS app integrates at the operating-system level: floating non-activating panels that overlay any application, system-wide keyboard input, app-aware contextual shortcuts, and native speech services.

**Core value proposition:** Fewer keystrokes to full expression, everywhere on macOS.

## What It Does

September for macOS is an always-available assistive overlay that helps users communicate with fewer keystrokes. It floats above all applications without stealing focus, predicts what the user wants to say using AI, speaks text aloud, transcribes others' speech, and adapts its shortcuts based on which app is focused.

## 4 Modes

| Mode | Description |
|------|-------------|
| **Type** | Full-screen accessible keyboard with AI predictions, word suggestions, edit shortcuts, navigation keys, and app-aware shortcut panels |
| **Talk** | Text-to-speech output + transcription input — speak what you've typed, transcribe what others say |
| **Write** | Floating markdown editor with focus modes (sentence/paragraph/typewriter), syntax highlighting by part of speech, and style checking |
| **Settings** | Appearance, AI Provider, Text to Speech, Transcription configuration |

## Key Differentiators from the Web App

- **System-wide presence** — NSPanel floats over any app without stealing focus
- **Keystroke injection** — CGEvents type directly into the focused app
- **App-aware shortcuts** — detects frontmost app via NSWorkspace, auto-switches shortcut panels (e.g., VS Code shortcuts when VS Code is focused)
- **On-device AI** — Apple Foundation Models (macOS 26+) as zero-cost, zero-latency option alongside OpenAI/Anthropic/Ollama
- **Native accessibility** — VoiceOver, Switch Control, Keyboard Navigation are first-class
- **Native TTS** — AVSpeechSynthesizer as zero-config baseline

## Design Language

- **Typography:** JetBrains Mono (primary), Geist (secondary)
- **Themes:** Light / Dark / System with full semantic color token system
- **Keyboard styles:** Rainbow (per-row accent colors: red, orange, green, blue) and Mono (uniform neutral)
- **6 reusable key components:** Standard (48x48), Special (60x48), Function (60x32), Dual (48x48), ShortcutButton (120x40), ShortcutFull (160x36)

## Screens

### 1. Keyboard Assembly (Type mode)

The core screen. A full accessible keyboard with AI-powered predictions.

- **Predictions Panel** — 3 AI sentence completions as pill-shaped cards
- **Word Suggestions** — 5 circular word chips for next-word prediction
- **Input Bar** — text field showing typed text + mode buttons (Type/Talk/Write/Settings)
- **Keyboard Grid** — 4 sections side by side:
  - Left Keypad — edit shortcuts (Cut, Copy, Paste, Undo, Save, etc.)
  - Accessible Keyboard — full QWERTY with function row
  - Right Keypad — navigation arrows, zoom, scroll
  - App Shortcuts — context-aware shortcuts for the focused app
- 4 visual variants: Dark Rainbow, Dark Mono, Light Rainbow, Light Mono

### 2. Settings — Appearance

Theme selection (Light / Dark / System) and Keyboard Style selection (Rainbow / Mono) presented as visual selection cards.

### 3. Settings — AI Provider

Provider selection cards (OpenAI / Anthropic / Ollama), model dropdown, API key field (masked input), and temperature slider.

### 4. Settings — Text to Speech

Engine selection cards (Apple AVSpeech / OpenAI TTS / ElevenLabs), voice dropdown, speed slider, and a Preview Voice button.

### 5. Settings — Transcription

Engine selection cards (Apple Speech / Whisper / Whisper.cpp), language dropdown, auto-punctuation toggle, and continuous listening toggle.

### 6. Panel Editor

A three-column editor for creating custom action panels:

- **Panels List** (left) — list of user-created panels with button counts
- **Canvas + AI Chat** (center) — visual panel preview, AI-assisted generation ("Describe your panel"), suggestion chips
- **Inspector** (right) — button properties: label, icon (SF Symbol), color (7 presets), action type (AI Prompt), prompt text, size (S/M/L/XL)

Panels link to specific apps and auto-appear when that app is focused. AI generates complete panels from natural language descriptions.

### 7. Write — Floating Panel

A floating markdown editor for focused writing:

- **Title bar** — traffic lights, nav arrows, breadcrumb (filename)
- **Menu bar** — File / Edit / Format / View / Focus (toggle)
- **Writing area** — JetBrains Mono 16px with paragraph focus mode
- **Focus modes** — Sentence, Paragraph, Typewriter (dims surrounding text)
- **Show Syntax** — color-coded parts of speech (Adjectives, Nouns, Adverbs, Verbs, Conjunctions)
- **Style Check** — highlights Fillers, Cliches, Redundancies, Custom patterns
- **Format bar** — block type, headings, lists, quote, code, checkbox, B/I/U, link, image
- **Footer** — word/char count, read time, focus mode indicator

## Architecture

```
SeptemberApp/
├── App/                     # Entry point, window management
├── Core/
│   ├── Models/              # SwiftData models
│   ├── DesignTokens/        # Colors, typography
│   └── Extensions/
├── Features/
│   ├── Keyboard/            # Type mode
│   ├── Panels/              # Panel editor + runtime
│   ├── Writer/              # Write mode
│   ├── Settings/            # All settings screens
│   └── Onboarding/
├── Services/
│   ├── AI/                  # Provider abstraction (OpenAI, Anthropic, Ollama, Foundation Models)
│   ├── Speech/              # TTS abstraction (AVSpeech, OpenAI TTS, ElevenLabs)
│   ├── Transcription/       # STT abstraction (Apple Speech, Whisper, Whisper.cpp)
│   ├── AppObserver/         # Focused-app detection via NSWorkspace
│   └── KeyInput/            # CGEvent keystroke injection
└── Resources/               # Color assets, fonts (JetBrains Mono, Geist)
```

### Architecture Guidelines

- `@Observable` with `@MainActor` for all view models (not `ObservableObject`)
- `@State` for view model ownership, `@Bindable` for two-way binding
- `NSPanel` + `NSHostingView` for floating keyboard (non-activating)
- Strict Swift concurrency: `async/await`, `Sendable` types
- Every interactive element gets `.accessibilityLabel()`, `.accessibilityHint()`, keyboard shortcuts
- Target sub-200ms view renders, 60fps animations
- SwiftData for local persistence
- API keys stored in macOS Keychain

## Technical Risks

| Risk | Mitigation |
|------|------------|
| CGEvent injection requires Accessibility permission | Onboarding guides through System Settings; banner if not granted |
| NSPanel non-activating behavior | Build early in Phase 1, test thoroughly before layering features |
| AI prediction latency (200-500ms) | 300ms debounce, optimistic UI, local alternatives (Ollama, Foundation Models) |
| whisper.cpp C++ integration | Use existing SPM wrapper (whisper-kit); start with Apple Speech |
| Markdown editor complexity in SwiftUI | NSTextView via NSViewRepresentable for editing surface; SwiftUI for chrome |
