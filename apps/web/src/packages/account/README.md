# Account Package

Local-first account state for the web and desktop apps.

## Public API

```ts
export { AccountProvider, useAccount } from './account-provider';
export {
  buildAccountSettingsExport,
  parseAccountSettingsExport,
  resolveAccountSettingsImport,
  serializeAccountSettingsExport,
  type AccountSettingsImportMode,
} from './settings-transfer';
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

- `schema.ts`: Zod schema and exported account types. Includes the optional
  `setup_mode` (`privacy | free | advanced`) — the mode picked on the Settings →
  Setup page; older accounts without it get their mode inferred from configs.
- `defaults.ts`: Local guest user and default account factory.
- `account-store.ts`: Platform storage adapter. Browser builds use the existing
  TanStack DB collection. Desktop builds use the Rust `user-account` record.
- `account-provider.tsx`: React context provider and `useAccount` hook. Account
  updates use a TanStack Query optimistic mutation with rollback.
- `settings-transfer.ts`: JSON export/import helpers for account-backed settings.
- `use-current-user.ts`: Platform user hook. The browser uses the local guest identity. Desktop uses the OS account from Rust.

## Usage

Wrap the app in `AccountProvider`:

```tsx
import { AccountProvider } from '@/packages/account';

export default function RootLayout({ children }) {
  return <AccountProvider>{children}</AccountProvider>;
}
```

Read and update account state with `useAccount`:

```tsx
import { useAccount } from '@/packages/account';

const { account, user, loading, updateAccount } = useAccount();

await updateAccount({ name: 'Guest' });
```

`AccountProvider` creates the platform account automatically. A new desktop account uses the OS account ID and display name. `updateAccount` accepts
`AccountUpdate`, which excludes `id`, `created_at`, and `updated_at`; the provider sets
`updated_at` internally.

The provider keeps its public shape across platforms. The desktop path never
opens SQLite directly; it uses the shared Rust record client. September does
not maintain a login session or remote account.

Export and import account-backed settings with the settings transfer helpers:

```ts
import {
  parseAccountSettingsExport,
  resolveAccountSettingsImport,
  serializeAccountSettingsExport,
} from '@/packages/account';

const json = serializeAccountSettingsExport(account);
const imported = parseAccountSettingsExport(json);
const updates = resolveAccountSettingsImport({
  current: account,
  imported,
  mode: 'merge',
});

await updateAccount(updates);
```

The JSON contains account, provider, suggestion, transcription, and speech settings. It excludes
internal account fields, but includes provider API keys when they are configured.

The browser downloads this JSON through an anchor. The desktop build sends the
JSON bytes to Rust and shows a native save dialog.

Import can merge or overwrite. Merge keeps current fields that are not present in the JSON.
Overwrite clears optional account fields and replaces nested settings with the JSON.
