# Account Package

Local-first account state for the web app.

## Public API

```ts
export { AccountProvider, useAccount } from './account-provider';
export { useCurrentUser } from './use-current-user';
export {
  AccountSchema,
  ProvidersSchema,
  SpeechConfigSchema,
  SuggestionsConfigSchema,
  TranscriptionConfigSchema,
  type Account,
  type AccountUpdate,
} from './schema';
```

## Architecture

- `schema.ts`: Zod schema and exported account types.
- `defaults.ts`: Local guest user and default account factory.
- `account-store.ts`: TanStack DB collection and local persistence hook.
- `account-provider.tsx`: React context provider and `useAccount` hook.
- `use-current-user.ts`: Local guest user hook.

## Usage

Wrap the app in `AccountProvider`:

```tsx
import { AccountProvider } from '@september/account';

export default function RootLayout({ children }) {
  return <AccountProvider>{children}</AccountProvider>;
}
```

Read and update account state with `useAccount`:

```tsx
import { useAccount } from '@september/account';

const { account, user, loading, updateAccount } = useAccount();

await updateAccount({ name: 'Guest' });
```

`AccountProvider` creates the local guest account automatically. `updateAccount` accepts
`AccountUpdate`, which excludes `id`, `created_at`, and `updated_at`; the provider sets
`updated_at` internally.
