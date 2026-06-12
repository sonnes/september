# September Web — Claude

Assistive communication app (ALS/MND). Next.js 15, React 19, Tailwind CSS 4, shadcn/ui. Local-first with IndexedDB via TanStack DB.

## Build

Use `pnpm` from workspace root — never `npm` or `yarn`.

| Command                              | Purpose              |
| ------------------------------------ | -------------------- |
| `pnpm install`                       | Install dependencies |
| `pnpm --filter @september/web dev`   | Dev server           |
| `pnpm --filter @september/web build` | Production build     |
| `pnpm --filter @september/web lint`  | Lint                 |

## Code Style

- All shared code in `packages/` as `@september/*` workspace packages
- Forms: `react-hook-form` + `zodResolver`. Use `@september/ui/components/form`
- Styling: shadcn/ui + Tailwind. Font family is Noto Sans
- Query hooks return `{ data, isLoading, error }` — error shape: `{ message: string }`
- Mutation hooks throw errors for error boundaries. Toast for user feedback
- All hooks must have explicit return type interfaces
- Prefer editing existing files over creating new ones

## Package Structure

Every `packages/*` module should have: `components/`, `hooks/`, `lib/`, `types/`, `index.ts`, `package.json`, `README.md`.

**READ and UPDATE the README.md in each module directory before and after making changes.**
