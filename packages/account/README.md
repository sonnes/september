# Account Package

This package manages user account data, synchronization between Supabase and Triplit, and file management for user documents.

## Features

- **Multi-DB Support**: Handles synchronization between cloud (Supabase) and local-first (Triplit) databases.
- **Real-time Sync**: Automatically updates UI when account data changes in the cloud.
- **File Management**: Provides abstractions for uploading and deleting user documents.
- **Configuration**: Manages AI feature settings (suggestions, transcription, speech) at the account level.

## Architecture

- `components/`: UI components like `AccountProvider`.
- `hooks/`: React hooks for accessing and managing account data.
- `lib/`: Business logic and service integrations (e.g., `SupabaseAccountService`).
- `types/`: Zod schemas and TypeScript interfaces for account data.

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

Access account data and actions using `useAccount`:

```tsx
import { useAccount } from '@/packages/account';

const { account, user, updateAccount } = useAccount();
```

