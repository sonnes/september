# September — Claude

September is an assistive communication app for people with ALS, MND, or speech/motor difficulties. Fewer keystrokes to full expression.

## Apps

**Web** — TanStack Start (Vite), React 19, Tailwind, in `apps/web/`. A
standalone pnpm project (its own `package.json`, `pnpm-lock.yaml`, and
`node_modules` — no workspace). See `apps/web/CLAUDE.md` for build commands and
code style rules; read it before working in the app.

The formerly-shared modules live inside the app at `apps/web/src/packages/*`,
imported via the `@/packages/*` alias (`@/*` → `src/*`), not as workspace
packages.

**Desktop** — an independent Tauri v2 app with its own React and Vite UI in
`apps/desktop/`. See `apps/desktop/CLAUDE.md` before working in it. Port screens
from the web app deliberately; do not share UI source between the apps.

**macOS** — a native floating keyboard in `apps/swift/` (SwiftUI + AppKit,
SwiftPM, no dependencies). See `apps/swift/CLAUDE.md` before working in it; its
design system comes from GitHub issue #10, not `DESIGN.md`.

```
september/
├── apps/web/              # Web app (standalone pnpm project)
│   └── src/packages/      # shared modules (import via @/packages/*)
├── apps/desktop/          # Independent Tauri app and React UI
├── apps/swift/            # Native macOS keyboard (SwiftPM)
└── docs/                  # Plans, notes, concepts
```

Run commands from the app directory or via the root `Makefile` (`make dev`,
`make desktop-dev`, `make mac-run`, `make mac-test`).

## TDD (strict)

Write tests BEFORE implementation. Run failing test, write minimum code to pass, confirm green. No exceptions.

## Rules

- Do what has been asked; nothing more, nothing less
- Prefer editing existing files over creating new ones
- READ and UPDATE the README.md in each module before and after changes
- No secrets in commits (`.env`, API keys, credentials)
- Run the build/lint/test commands listed in the app's CLAUDE.md before committing

## Documentation


- **Concept docs** (`docs/concepts/`): one file per concept with YAML frontmatter (`title`, `description`, `package`). Create for new abstractions, update when APIs/behavior change.

## Plans and Research

- Plans go in `./docs/plans/`, research in `./docs/research/`, both named `YYYY-MM-DD-name.md`.
- After user approves the plan, move the plan to `./docs/plans/` before implementation.

## Implementation Notes

- While implementing a plan, keep a running notes file in `./docs/notes/`, named `YYYY-MM-DD-name.md` to match its plan (e.g. a plan `docs/plans/2026-05-24-create-tasks.md` pairs with `docs/notes/2026-05-24-create-tasks.md`).
- Notes record only what is **not** in the plan: decisions made where the spec was silent, deviations from the spec, tradeoffs, and anything the reviewer should know. Don't restate the plan.
- Link back to the plan in the note's frontmatter (`plan:`) and update the note as the implementation evolves.

## Archiving Old Docs

- When `docs/mocks/`, `docs/notes/`, `docs/plans/`, or `docs/research/` accumulate completed or superseded work, archive it off `main` to the `archive/old-docs` orphan branch rather than deleting it.
- The archive branch is a detached/orphan branch (no parent, no app code) — history-preserving storage only. Browse with `git show archive/old-docs:<path>`.
- Keep only current, in-progress docs on `main`; move everything predating the active work to the archive.

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
