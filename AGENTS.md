# September — Claude

September is an assistive communication app for people with ALS, MND, or speech/motor difficulties. Fewer keystrokes to full expression.

## Apps

| App                | Path           | Stack                                      |
| ------------------ | -------------- | ------------------------------------------ |
| Web                | `apps/web/`    | TanStack Start (Vite), React 19, Tailwind  |
| macOS (Swift)      | `apps/swift/`  | SwiftUI + AppKit, SwiftData                |

Each app has its own `CLAUDE.md` with build commands and code style rules. Read the relevant one before working in that app.

## Monorepo

pnpm workspace. The web app is self-contained: its formerly-shared `@september/*`
modules now live inside it at `apps/web/src/packages/*` (resolved via the
`@september/*` tsconfig path alias, not as workspace packages).

```
september/
├── apps/web/              # Web app (self-contained)
│   └── src/packages/      # @september/* modules (resolved via path alias)
├── apps/swift/            # macOS app (Swift Package)
└── docs/swift/            # macOS design specs, roadmap, assets
```

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

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
