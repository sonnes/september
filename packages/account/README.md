# Account Package

This package manages user account data using TanStack DB for local-first storage and Supabase for authentication and file storage.

## Features

- **Local-First with TanStack DB**: Primary store for account data, providing fast, reactive updates.
- **Supabase Authentication**: Integrated authentication state via `useAuth`.
- **File Management**: abstractions for uploading and deleting user documents via `useStorage` (Supabase Storage).
- **Configuration**: Manages AI feature settings (suggestions, transcription, speech) at the account level.

## Architecture

- `context.tsx`: Core context provider (`AccountProvider`) and `useAccountContext` hook.
- `hooks/`: Domain-specific React hooks:
  - `useDbAccount`: TanStack DB operations for account collection.
  - `useAuth`: Supabase authentication state.
  - `useStorage`: Supabase file management.
- `lib/`: Business logic and service integrations.
- `types/`: Zod schemas and TypeScript interfaces for account data.
- `db.ts`: TanStack DB collection definition.

## Usage

### Provider

Wrap your application in `AccountProvider` (usually in `app/layout.tsx`):

```tsx
import { AccountProvider } from '@/packages/account';

export default function RootLayout({ children }) {
  return (
    <AccountProvider>
      {children}
    </AccountProvider>
  );
}
```

### Hook

Access account data and actions using `useAccountContext`:

```tsx
import { useAccountContext } from '@/packages/account';

const { account, user, updateAccount } = useAccountContext();
```

### Direct DB Access

For specialized cases, you can use the domain-specific hooks:

```tsx
import { useDbAccount, useAuth, useStorage } from '@/packages/account';

const { account, update } = useDbAccount(userId);
const { user } = useAuth();
const { uploadFile } = useStorage();
```
