# Account Package

Local-first account state for the web app.

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

- `schema.ts`: Zod schema and exported account types.
- `defaults.ts`: Local guest user and default account factory.
- `account-store.ts`: TanStack DB collection and local persistence hook.
- `account-provider.tsx`: React context provider and `useAccount` hook.
- `settings-transfer.ts`: JSON export/import helpers for account-backed settings.
- `use-current-user.ts`: Local guest user hook.

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

`AccountProvider` creates the local guest account automatically. `updateAccount` accepts
`AccountUpdate`, which excludes `id`, `created_at`, and `updated_at`; the provider sets
`updated_at` internally.

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

Import can merge or overwrite. Merge keeps current fields that are not present in the JSON.
Overwrite clears optional account fields and replaces nested settings with the JSON.
