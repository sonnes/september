---
title: Task-based Help
description: The browser and desktop apps share searchable task guides, including setup access and written fallbacks when visual media is missing.
package: core, app-ui, desktop, web
---

# Task-based Help

September organizes Help around the task a person wants to finish. A person
can start with a common task, search, or browse categories without learning the
application structure first.

The Help home presents these elements in order:

1. **Speak your first message**, **Fix a problem**, and **Use September in a
   call**.
2. Search across the guide catalog.
3. Links to seven task categories, followed by the category sections.

A non-empty search replaces category browsing with matching guides. Search is
case-insensitive and matches every query word against each guide's title,
summary, keywords, and steps. Results retain catalog order. Search also includes alternative task titles
and steps. The app window remembers the query and scroll position across guide
navigation. Reloading the app clears this temporary state.

Category links clear the query, show all categories, and focus the destination
heading. Clear search returns focus to the search field. The call shortcut
shows its Mac app requirement before the reader opens it.

## Shared guide catalog

`packages/core/rules/help.ts` owns the platform-independent catalog. Each guide
has a stable slug, category, action title, outcome, search keywords, platform
labels, prerequisites, numbered steps, expected result, recovery guidance,
related guide slugs, optional alternative tasks, and optional media metadata.

The privacy category includes a backup and restore guide. It tells the reader
that the file is not encrypted, keys are excluded, and restore replaces the
current portable data.

The platform labels are **Browser**, **Mac app**, and **Mac keyboard**. The Help
home shows all applicable guides instead of hiding another platform's
instructions. Related links and search operate on the same catalog.

`packages/app-ui/pages/help.tsx` renders the catalog for both applications.
`HelpScreen` selects the home or one guide. `HelpGuideContent` renders the
complete written guide by itself so another surface can reuse it.

## Routes and setup access

The browser and desktop route trees expose the same Help addresses:

```text
/help
/help/$guideSlug
```

An unknown guide slug returns to `/help`. Stable slugs let a feature or error
link directly to one recovery task.

Help routes use the application shell but remain outside the finished-setup
guard. During setup, the onboarding sidebar opens **Set up September** in an
inline sheet. Opening and closing that sheet does not navigate, complete setup,
or change the saved setup answers.

## Written guidance and media

Every guide remains usable as text. It presents the outcome and platform
labels first, then prerequisites, numbered steps, an expected result, recovery
guidance, and related guides.

Guides can separate alternative tasks into named sections with their own steps
and outcomes. OpenRouter authorization and ElevenLabs key entry use separate
sections. Downloading a backup and restoring one also use separate sections.

Media is optional. Screenshot details follow the step named by `afterStep`,
which counts from one. Screenshots without a step number appear in a Screen
overview disclosure after the instructions. The setup, Talk, connection,
export, and sound guides include browser screenshots.

Captures use the 1376 × 1032 iPad landscape viewport at 2× pixel density.
The `width` field records the capture width in CSS pixels. Small details keep
that width instead of stretching across the guide. Each image has alternative
text, a visible caption, and an Enlarge screenshot button. A dialog shows the
larger image. Escape and Close return focus to the trigger without moving the
guide. The app shell and viewer controls provide targets of at least 44px.

A screenshot needs a source. If loading fails, the written steps remain
available. A video needs both a source and captions. Videos use controls,
never autoplay, and include an expandable transcript. Missing optional media
never hides an instruction.
