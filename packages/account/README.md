# Account Package

This package manages user account data using TanStack DB for local-first storage.

## Features

- **Local-First with TanStack DB**: Primary store for account data, providing fast, reactive updates.
- **Local Auth**: Always runs as a local guest user via `useAuth`.
- **Configuration**: Manages AI feature settings (suggestions, transcription, speech) at the account level.

## Architecture

- `context.tsx`: Core context provider (`AccountProvider`) and `useAccountContext` hook.
- `hooks/`: Domain-specific React hooks:
  - `useDbAccount`: TanStack DB operations for account collection.
  - `useAuth`: Local user state.
- `lib/`: Business logic and service integrations.
- `types/`: Zod schemas and TypeScript interfaces for account data.
- `db.ts`: TanStack DB collection definition using local storage persistence.

## Usage

### Provider

Wrap your application in `AccountProvider` (usually in `app/layout.tsx`):

```tsx
import { AccountProvider } from '@september/account';

export default function RootLayout({ children }) {
  return <AccountProvider>{children}</AccountProvider>;
}
```

### Hook

Access account data and actions using `useAccountContext`:

```tsx
import { useAccountContext } from '@september/account';

const { account, user, updateAccount } = useAccountContext();
```

### Direct DB Access

For specialized cases, you can use the domain-specific hooks:

```tsx
import { useAuth, useDbAccount } from '@september/account';

const { account, update } = useDbAccount(userId);
const { user } = useAuth();
```
