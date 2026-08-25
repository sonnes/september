---
title: Build the September help system
description: Replace the shared Help placeholder with task-based, searchable guidance for the browser app, desktop app, and macOS keyboard.
status: approved
---

# Build the September help system

September will answer common questions inside the product with as little
typing as possible. The primary reader is a person with a speech or motor
difficulty who is trying to complete a task. Caregivers and clinicians are
secondary readers.

The representative journey is speaking a first message: open a space, type a
few letters, choose a suggestion, and press Speak. Help begins with that
outcome instead of explaining the product screen by screen.

## Information architecture

```text
Help
├── Start here
│   ├── Set up September
│   ├── Speak your first message
│   ├── Learn the Talk screen
│   └── Choose the browser or Mac app
├── Communicate with fewer keystrokes
│   ├── Use word and sentence suggestions
│   ├── Save a phrase
│   ├── Use phrase codes
│   └── Find and replay an earlier message
├── Organize conversations
│   ├── Create and switch spaces
│   ├── Tell September about a space
│   ├── Prepare a note
│   ├── Read or present a note
│   └── Export text, audio, or video
├── Choose how September speaks and writes
│   ├── Choose and preview a voice
│   ├── Clone a voice
│   ├── Choose writing help
│   └── Connect OpenRouter or ElevenLabs
├── Use September on a Mac
│   ├── Speak into FaceTime or Zoom
│   ├── Show words through September Camera
│   ├── Set up the floating keyboard
│   ├── Grant Accessibility permission
│   └── Use the input bar and shortcut panels
├── Privacy, data, and usage
│   ├── Understand what stays on the device
│   ├── Understand what connected services receive
│   └── Review typing saved and service use
└── Fix a problem
    ├── Fix missing sound
    ├── Restore missing suggestions
    ├── Reconnect a service
    ├── Restore the microphone or camera
    ├── Make the floating keyboard type
    └── Get more help
```

The Help home leads with three large shortcuts: **Speak your first message**,
**Fix a problem**, and **Use September in a call**. Search follows the
shortcuts, because a common answer must not require typing. Category cards
then expose the full structure.

Each guide has a stable slug and a deep link. The Help screen opens a guide
inside the shared application shell, with a clear return to the Help home.
Platform labels distinguish **Browser**, **Mac app**, and **Mac keyboard**.
The active app can prefer its own guidance, but it must not hide the other
platforms.

## Guide contract

Every guide has:

1. An action title and a one-sentence outcome.
2. Its platforms and any prerequisite.
3. Numbered steps with one action in each step.
4. An expected result.
5. A short recovery section for the likely failure.
6. Related guides.

The guide catalog is plain data. It owns category order, titles, summaries,
keywords, platforms, steps, expected results, recovery guidance, related
slugs, and optional media metadata. Pure rules select a guide, group guides,
and search the catalog without a renderer.

## Routes and entry points

Keep `/help` as the Help home in both route graphs and add
`/help/$guideSlug` for a guide. Web and desktop render one shared Help screen.
An unknown slug returns to `/help`.

Help remains in the main sidebar after setup. Setup guidance must also be
reachable while onboarding is incomplete. Add a small Help action to the
onboarding layout that can open the setup guide without completing setup or
changing the saved onboarding answers.

Feature screens can link to a guide when a failure already names a specific
recovery task. Do not add unrelated hints throughout the product in this
change.

## Media

The first implementation includes media slots and accessible fallbacks. It
does not block useful written guidance on recording every asset.

| Guide | Medium |
| --- | --- |
| Learn the Talk screen | Annotated screenshot |
| Speak your first message | Short video with still steps |
| Suggestions and phrase codes | Short video |
| Spaces, settings, and voice selection | Cropped screenshots |
| Present a note | Short video |
| Export a note | Screenshots |
| FaceTime or Zoom setup | Video across both applications |
| Accessibility permission | Numbered macOS screenshots |
| Floating keyboard panels | Short video |

Media never carries the only copy of an instruction. Videos do not autoplay
and include controls, captions, a transcript, and a poster. Screenshots use
demonstration data, numbered annotations, and action-oriented alternative
text. Missing assets show the written guide without an empty or broken frame.

## Test-first sequence

1. Write failing catalog tests for category order, unique slugs, valid related
   links, platform labels, search, and the three Help-home shortcuts.
2. Add the minimum pure guide catalog and search rules to pass them.
3. Write failing route tests for the Help home, guide route, unknown slug, and
   route parity between web and desktop.
4. Add the shared Help page and the two route entries.
5. Write a failing source-level accessibility check for the onboarding Help
   entry, then add it without changing onboarding state.
6. Add the first written guides and media metadata through the tested catalog.
7. Update the root and application-UI READMEs and add a concept document for
   the shared help system.
8. Run core, web, and desktop tests; web lint; and both production builds.

## Acceptance

- `/help` no longer shows the unavailable-screen placeholder.
- The three urgent tasks appear before search and the category list.
- A reader can browse or search the complete approved guide hierarchy.
- Every guide can be opened through a stable URL.
- Search tolerates case and matches titles, summaries, keywords, and steps.
- Platform differences are explicit without duplicating the whole Help UI.
- Setup help is reachable before setup is complete.
- Missing screenshots or videos do not hide written instructions.
- Every related guide points to an existing guide.
- The browser and desktop builds use the same catalog and screen.
- Core, web, and desktop tests, web lint, and both builds pass.
