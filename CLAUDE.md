# September — Claude

September is an assistive communication app for people with ALS, MND, or speech/motor difficulties. Fewer keystrokes to full expression.

## Apps

| App                | Path           | Stack                          |
| ------------------ | -------------- | ------------------------------ |
| Web                | `apps/web/`    | Next.js 15, React 19, Tailwind |
| macOS (Swift)      | `apps/swift/`  | SwiftUI + AppKit, SwiftData    |

Each app has its own `CLAUDE.md` with build commands and code style rules. Read the relevant one before working in that app.

## Monorepo

pnpm workspace. Shared packages in `packages/` with `@september/*` naming.

```
september/
├── apps/web/          # Web app
├── apps/swift/        # macOS app (Swift Package)
├── packages/          # Shared TS packages (@september/*)
└── docs/swift/        # macOS design specs, roadmap, assets
```

## TDD (strict)

Write tests BEFORE implementation. Run failing test, write minimum code to pass, confirm green. No exceptions.

## Rules

- Do what has been asked; nothing more, nothing less
- Prefer editing existing files over creating new ones
- READ and UPDATE the README.md in each module before and after changes
- No secrets in commits (`.env`, API keys, credentials)
- Run the build/lint/test commands listed in the app's CLAUDE.md before committing
