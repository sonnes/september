---
name: screenshot
description: Capture screenshots of the September web app across multiple screen sizes (desktop/laptop/tablet/mobile) using the installed Chrome. Use when asked to screenshot the app, refresh product/marketing images, capture a feature, or generate responsive captures.
---

# September screenshots

Drives the **already-running** dev app with `playwright-core` + your installed Chrome (no
browser download), and writes one PNG per route per screen size.

September is **local-first**: there is no server-side auth and no daemon — all data lives in
the browser's IndexedDB. So unlike a typical app, there is no session to mint. The catch is
that a fresh headless browser context starts **empty**: marketing and static routes shoot
fine, but detail pages (a Talk space, a note) have nothing to show. To capture populated
surfaces, point `--user-data-dir` at a Chrome profile you've already used (see below).

## Prerequisites

1. **Dev is running** — `make dev` (web on `:3009`; or `pnpm -C apps/web dev --port 3009`).
2. **Google Chrome** installed (default macOS path). Override with `--channel`.
3. **One-time install** of the driver into this skill dir (kept out of the app project so it
   lands in the skill's own `node_modules`):
   ```bash
   pnpm -C .claude/skills/screenshot install --ignore-workspace
   # or, with plain npm:  npm install --prefix .claude/skills/screenshot
   ```

## Populated vs empty shots (read this)

Because data lives in IndexedDB per browser profile, a throwaway headless context has no
spaces or notes. Two ways to get real content:

1. **`--user-data-dir <dir>`** — runs a *persistent* Chrome context against that profile dir,
   so IndexedDB/localStorage survive between runs. Seed it once: launch the dev app in that
   profile, create a space / add notes, then re-run the script pointed at the same dir.
   Detail routes are then auto-discovered (see below).
2. **`--routes`** — pass explicit paths (e.g. a known space slug) and skip discovery entirely.

Without either, you'll get clean shots of the home, onboarding, dashboard, and settings, and
the detail routes are silently dropped (no slug to navigate to).

### Slug discovery

For detail pages the script loads `/talk` and `/notes` and reads the first
`a[href^="/talk/"]` / `a[href^="/notes/"]` link from the rendered DOM to get a real space
slug. Empty store → those routes are skipped.

## Usage

```bash
# All routes, all four sizes, light theme → docs/screenshots/<size>/<route>.png
node .claude/skills/screenshot/shoot.mjs

# A subset: just two sizes
node .claude/skills/screenshot/shoot.mjs --sizes desktop,mobile

# Light + dark in one run (nests under docs/screenshots/<theme>/<size>/)
node .claude/skills/screenshot/shoot.mjs --theme light,dark

# Populated shots from a seeded Chrome profile
node .claude/skills/screenshot/shoot.mjs --user-data-dir ~/.september-shots-profile

# Custom routes (skips discovery) and output dir
node .claude/skills/screenshot/shoot.mjs --routes /,/talk,/onboarding --out /tmp/shots
```

### Flags

| Flag              | Default                        | Meaning                                                  |
| ----------------- | ------------------------------ | -------------------------------------------------------- |
| `--base`          | `http://localhost:3009`        | Web (vite) origin to screenshot                          |
| `--out`           | `docs/screenshots`             | Output root                                              |
| `--sizes`         | `desktop,laptop,tablet,mobile` | Subset of the size presets below                         |
| `--theme`         | `light`                        | `light`, `dark`, or `light,dark`                         |
| `--user-data-dir` | _(none)_                       | Persistent Chrome profile dir (keeps IndexedDB between runs) |
| `--routes`        | _(discover)_                   | Comma list to override the route set                     |
| `--channel`       | `chrome`                       | Playwright browser channel (`chrome`, `msedge`, …)       |
| `--settle`        | `2000`                         | ms to wait after load before the shot                    |

### Theme

September's dark mode is **class-based** — a `.dark` class on `<html>`, not a
`prefers-color-scheme` media query (see `apps/web/src/styles/globals.css`). So Playwright's
`colorScheme` emulation has no effect; the script instead injects the `.dark` class itself
when `--theme dark` is requested.

### Screen sizes (deviceScaleFactor 2)

| Preset    | Viewport                   |
| --------- | -------------------------- |
| `desktop` | 1440 × 900                 |
| `laptop`  | 1280 × 800                 |
| `tablet`  | 834 × 1112                 |
| `mobile`  | 390 × 844 (emulated touch) |

## What it captures

Static routes (home, onboarding, dashboard, talk, notes, voices, clone, help, settings →
providers/speech/suggestions/transcription, and the legal pages) plus detail pages discovered
from the live DOM: the first **Talk space** and **note space**. Override entirely with
`--routes`.

## Troubleshooting

- **Detail pages missing** — the store is empty. Use `--user-data-dir` against a seeded
  profile, or pass slugs via `--routes`.
- **`browserType.launch: Chromium distribution 'chrome' not found`** — install Chrome, or pass
  `--channel msedge`, or `npm i playwright` and drop `--channel` to download Chromium.
- **Blank / skeleton shots** — raise `--settle`, or the surface genuinely has no seeded data.
- **`Cannot find package 'playwright-core'`** — run the one-time install in Prerequisites.
- **Connection refused** — the dev server isn't up on `:3009`; run `make dev` first, or pass
  `--base` with the right port.
