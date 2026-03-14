# September for macOS — Development Roadmap

## Overview

The roadmap is organized into 8 phases. **MVP = Phases 0-3 (~10 weeks)** covering the core value proposition: floating keyboard + AI predictions + TTS + appearance settings. The full vision spans ~22 weeks.

## Phase 0: Foundation (Weeks 1-2)

**Goal:** Project scaffolding, design system, data layer, service protocols.

1. **Xcode project** — Swift Package structure, macOS 14+ (Sonoma), strict concurrency checking
2. **Design token system** — Color asset catalogs (light/dark), keyboard colors, sidebar colors, typography constants (JetBrains Mono, Geist)
3. **SwiftData models** — Account (mirrors web app's AccountSchema), Panel, PanelButton, Document
4. **Service protocols** — `AIService`, `SpeechService`, `TranscriptionService` with mock implementations
5. **AVSpeechService** — zero-config TTS baseline
6. **App shell** — main window with tab navigation (Type/Talk/Write/Settings), NSPanel infrastructure

### Key Files

- `Core/Models/Account.swift` — SwiftData model
- `Core/DesignTokens/Colors.swift` — semantic color system
- `Core/DesignTokens/Typography.swift` — font definitions
- `Services/AI/AIService.swift` — protocol definition
- `Services/Speech/SpeechService.swift` — protocol + AVSpeech implementation

---

## Phase 1: Accessible Keyboard MVP (Weeks 3-5)

**Goal:** A usable floating keyboard that types into any app. No AI yet — just reliable input.

1. **6 key components** — KeyStandard (48x48), KeySpecial (60x48), KeyFunction (60x32), KeyDual (48x48), ShortcutButton (120x40), ShortcutFull (160x36)
2. **Keyboard grid** — function row + QWERTY + 4-section layout (left keypad, main keyboard, right keypad, app shortcuts placeholder)
3. **Input bar** — shows typed text, mode buttons
4. **NSPanel floating window** — non-activating, stays above other apps
5. **CGEvent keystroke injection** — key presses type into the focused app
6. **Dark Rainbow + Dark Mono** keyboard styles
7. **Accessibility** — `.accessibilityLabel()` on every key, keyboard navigation, VoiceOver

### Not Included

AI predictions, word suggestions, light themes, app-aware shortcuts, settings UI.

### Key Files

- `Features/Keyboard/Components/KeyStandard.swift`
- `Features/Keyboard/Views/KeyboardAssemblyView.swift`
- `Features/Keyboard/Views/InputBar.swift`
- `Services/KeyInput/KeyEventInjector.swift`
- `App/FloatingPanel.swift` — NSPanel subclass

---

## Phase 2: AI Predictions + Word Suggestions (Weeks 6-8)

**Goal:** The intelligence layer. Dramatically reduce keystrokes with AI predictions.

1. **AI provider implementations** — OpenAI, Anthropic, Ollama (via URLSession)
2. **Predictions panel** — 3 AI sentence completions, tap to insert
3. **Word suggestions** — 5 next-word chips, tap to insert
4. **Prediction engine** — debounced input (300ms) → AI call → predictions. Cancellable, optimistic UI (show stale predictions while loading)
5. **Settings: AI Provider** — provider selection cards, model dropdown, API key field (SecureField), temperature slider

### Key Files

- `Services/AI/OpenAIService.swift`
- `Services/AI/AnthropicService.swift`
- `Services/AI/OllamaService.swift`
- `Features/Keyboard/Views/PredictionsPanel.swift`
- `Features/Keyboard/Views/WordSuggestions.swift`
- `Features/Keyboard/ViewModels/PredictionEngine.swift`
- `Features/Settings/Views/AIProviderSettingsView.swift`

---

## Phase 3: TTS + Appearance (Weeks 9-10)

**Goal:** Give users their voice. Add visual customization.

1. **TTS providers** — polish AVSpeech, add OpenAI TTS + ElevenLabs
2. **Speak action** — button in input bar, visual feedback during speech
3. **Audio playback service** — for API-based TTS that return audio data
4. **Settings: Text to Speech** — engine selection cards, voice dropdown, speed slider, Preview Voice button
5. **Settings: Appearance** — theme cards (Light/Dark/System), keyboard style cards (Rainbow/Mono)
6. **Light theme keyboard variants** — Light Rainbow, Light Mono

### Key Files

- `Services/Speech/ElevenLabsTTSService.swift`
- `Services/Speech/OpenAITTSService.swift`
- `Services/Audio/AudioPlayer.swift`
- `Features/Settings/Views/SpeechSettingsView.swift`
- `Features/Settings/Views/AppearanceSettingsView.swift`

---

## Phase 4: Transcription + App-Aware Shortcuts (Weeks 11-13)

**Goal:** Two-way communication. Context-aware keyboard.

1. **Transcription engines** — Apple Speech (SFSpeechRecognizer), Whisper API, whisper.cpp (local via SPM)
2. **Talk mode** — live transcription display, continuous listening toggle
3. **Context pipeline** — transcribed text feeds into AI prediction context for better suggestions
4. **App observer** — NSWorkspace frontmost app detection
5. **App shortcuts section** — dynamically loads shortcuts for focused app. Built-in sets for Safari, Notes, Mail, VS Code, Finder
6. **Settings: Transcription** — engine cards, language dropdown, auto-punctuation toggle, continuous listening toggle

### Key Files

- `Services/Transcription/TranscriptionService.swift` — protocol
- `Services/Transcription/AppleSpeechTranscription.swift`
- `Services/Transcription/WhisperCppTranscription.swift`
- `Services/AppObserver/AppObserver.swift`
- `Features/Keyboard/Views/AppShortcutsSection.swift`
- `Features/Settings/Views/TranscriptionSettingsView.swift`

---

## Phase 5: Panel Editor (Weeks 14-16)

**Goal:** Custom AI-powered action panels.

1. **Three-column editor** — panels list, canvas + AI chat, inspector
2. **Button properties** — label, icon (SF Symbol), color (7 presets), action (AI Prompt), prompt text, size (S/M/L/XL)
3. **App linking** — panels auto-appear when linked app is focused (uses AppObserver from Phase 4)
4. **AI panel generation** — natural language description → AI generates complete panel with buttons
5. **Panel runtime** — floating panel displaying and executing custom button actions

### Key Files

- `Core/Models/Panel.swift` — SwiftData model
- `Features/Panels/Views/PanelEditorView.swift`
- `Features/Panels/Views/ButtonInspectorView.swift`
- `Features/Panels/ViewModels/PanelGeneratorViewModel.swift`
- `Features/Panels/Views/PanelRuntimeView.swift`

---

## Phase 6: Floating Writer (Weeks 17-19)

**Goal:** Markdown editor with focus modes and writing analysis.

> This phase can run in parallel with Phases 4-5.

1. **Floating editor window** — NSPanel (activating, since the user types into it)
2. **Markdown editor** — JetBrains Mono 16px, syntax highlighting, block types (paragraphs, headings, lists, blockquotes, code, checkboxes)
3. **Format bar + menu bar** — File/Edit/Format/View/Focus, formatting buttons
4. **Focus modes** — Sentence / Paragraph / Typewriter (dims surrounding text)
5. **Show Syntax** — NLTagger parts of speech color-coding (Adjectives, Nouns, Adverbs, Verbs, Conjunctions)
6. **Style Check** — fillers, cliches, redundancies, custom patterns
7. **Footer stats** — word/char count, read time, focus mode indicator
8. **Document persistence** — SwiftData Document model

### Key Files

- `Features/Writer/Views/WriterView.swift`
- `Features/Writer/Views/FormatBar.swift`
- `Features/Writer/ViewModels/WriterViewModel.swift`
- `Features/Writer/Views/FocusModeOverlay.swift`
- `Features/Writer/Services/SyntaxAnalyzer.swift`
- `Core/Models/Document.swift`

---

## Phase 7: Polish & Release (Weeks 20-22)

**Goal:** First-run experience, accessibility audit, performance, distribution.

1. **Onboarding** — permissions walkthrough (Accessibility API, Microphone), account setup, AI provider wizard, voice preview
2. **Accessibility audit** — VoiceOver, Switch Control, keyboard-only navigation, Dynamic Type, Reduced Motion
3. **Performance** — sub-200ms renders, 60fps, memory profiling for long sessions
4. **Keychain** — move API keys from SwiftData to macOS Keychain
5. **Menu bar item** — quick show/hide, mode switching
6. **Distribution** — Sparkle for auto-update or TestFlight for beta

---

## Summary

| Phase | Weeks | Outcome |
|-------|-------|---------|
| 0 Foundation | 1-2 | Scaffolding, design system, data models, protocols |
| 1 Keyboard MVP | 3-5 | Floating keyboard that types into any app |
| 2 AI Predictions | 6-8 | Sentence + word predictions, AI provider settings |
| 3 TTS + Appearance | 9-10 | Speak aloud, theme customization |
| **MVP** | **1-10** | **Core value proposition complete** |
| 4 Transcription + Shortcuts | 11-13 | Speech input, app-aware shortcuts |
| 5 Panel Editor | 14-16 | Custom AI action panels |
| 6 Floating Writer | 17-19 | Markdown editor with focus modes |
| 7 Polish + Release | 20-22 | Onboarding, accessibility audit, distribution |

## Reference: Web App Types to Mirror

The Swift models should align with these canonical domain models from the web app:

- `packages/shared/types/ai-config.ts` — AI provider/feature configuration
- `packages/account/types/index.ts` — Account schema (all user settings)
- `packages/keyboards/types/index.ts` — Keyboard/button domain types
- `packages/ai/lib/registry.ts` — AI provider registry pattern
