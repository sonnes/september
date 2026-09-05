# September — Claude

September is an assistive communication app for people with ALS, MND, or speech/motor difficulties. Fewer keystrokes to full expression.

## Apps

**Web** — a Vite SPA with React 19, TanStack Router, and Tailwind, in `apps/web/`.
It belongs to the root pnpm workspace. See `apps/web/CLAUDE.md` for build
commands and code style rules; read it before working in the app.

Browser services use one native IndexedDB database. Shared rules, autocomplete,
primitives, tokens, and application screens live in `packages/*`.

**Desktop** — a Tauri v2 app with a React and Vite bootstrap in `apps/desktop/`.
See `apps/desktop/CLAUDE.md` before working in it. It renders the same application
UI packages as web and supplies Tauri platform services.

**macOS** — a native floating keyboard in `apps/keyboard/` (SwiftUI + AppKit,
SwiftPM, no dependencies). See `apps/keyboard/CLAUDE.md` before working in it; its
design system comes from GitHub issue #10, not `DESIGN.md`.

```
september/
├── apps/web/              # Browser bootstrap, routes, and IndexedDB services
├── apps/desktop/          # Tauri bootstrap, services, and native backend
├── apps/keyboard/         # Native macOS keyboard (SwiftPM)
├── packages/core/         # Pure rules and autocomplete
├── packages/ui/           # Design tokens and generic primitives
├── packages/app-ui/       # Shared layouts, blocks, and application screens
└── docs/                  # Plans, notes, concepts
```

Run commands from the app directory or via the root `Makefile` (`make dev`,
`make desktop-dev`, `make mac-run`, `make mac-test`).

## TDD (strict)

Write tests BEFORE implementation. Run failing test, write minimum code to pass, confirm green. No exceptions.

## Tests

- Test current functional behavior through public boundaries.
- Do not test that removed code, files, routes, controls, or wording stay absent.
- Do not pin prose, visual design, CSS classes, dimensions, colors, or layout in tests.
- Prefer inputs, outputs, state changes, persistence, accessibility behavior, and external integrations.
- Use negative assertions when they enforce current security, privacy, validation, or state behavior.

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
