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
3. Seven task categories, from setup through troubleshooting.

A non-empty search replaces category browsing with matching guides. Search is
case-insensitive and matches every query word against each guide's title,
summary, keywords, and steps. Results retain catalog order.

## Shared guide catalog

`packages/core/rules/help.ts` owns the platform-independent catalog. Each guide
has a stable slug, category, action title, outcome, search keywords, platform
labels, prerequisites, numbered steps, expected result, recovery guidance,
related guide slugs, and optional media metadata.

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

Media is optional. The Talk-screen overview ships in both apps and opens at
full size from its guide. A screenshot renders only when its metadata has a
source; its alternative text describes the action shown. A video renders only
when it has both a source and a caption track. Rendered videos use controls,
do not autoplay, can use a poster, and include an expandable transcript.

If an asset is missing or a video has no captions, the renderer omits the
whole media frame. The written steps remain visible, so an absent screenshot
or recording never hides an instruction or leaves a broken placeholder.
