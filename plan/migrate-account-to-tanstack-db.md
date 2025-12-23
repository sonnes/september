# Migration Plan: Account Package to TanStack DB

This document outlines the steps to migrate the `packages/account/` module from Triplit to TanStack DB. Per project rules, Supabase will be restricted to Authentication and File Storage only. The Supabase `accounts` table and related sync logic are to be deprecated.

## Overview

We are moving account data (profile, settings, AI configurations) entirely to TanStack DB.

- **TanStack DB**: Primary and only store for account data (local-only for now).
- **Supabase**: Used exclusively for `supabase.auth` (user identity) and `supabase.storage` (documents).
- **Triplit**: Completely removed.

## Step-by-Step Migration

### 1. Define the Collection Schema

Use the existing `AccountSchema` in `packages/account/types/index.ts`. Ensure it handles the local-first nature of the data.

### 2. Initialize the TanStack DB Collection

Create `packages/account/db.ts`:

- Define `accountCollection` using `createCollection` and `localStorageCollectionOptions`.
- id: `user-preferences`
- storageKey: `app-user-prefs`
- Key: `id`.
- Note: This collection replaces both the Triplit `accounts` and Supabase `accounts` logic for data storage.

### 3. Create the Domain Hook

Create `packages/account/hooks/use-db-account.ts`:

- Implement `useDbAccount(id?: string)` using `useLiveQuery`.
- Export CRUD actions that operate on the `accountCollection`.

### 4. Create Separate Supabase Hooks (Auth & Storage)

Create `packages/account/hooks/use-auth.ts` and `packages/account/hooks/use-storage.ts`:

- **`use-auth.ts`**: Handle `supabase.auth` state (`getUser`, session changes).
- **`use-storage.ts`**: Handle file operations (`uploadFile`, `deleteFile`) using `supabase.storage`.
- **Note**: Remove all account data logic (fetching/updating/realtime) from these hooks as it moves to TanStack DB.

### 5. Update AccountProvider

Refactor `packages/account/components/account-provider.tsx`:

- Use `useDbAccount` as the source of truth for the `account` object.
- Use `useAuth` for the `user` (auth state).
- Use `useStorage` for file operations.
- Initialize the local account in TanStack DB if it doesn't exist (using the `user.id` from `useAuth`).

### 6. Cleanup

- Delete `packages/account/hooks/use-db-account-triplit.ts`.
- Delete `packages/account/hooks/use-db-account-supabase.ts`.
- Remove `packages/account/lib/supabase-service.ts` if no longer needed for other services.
- Update `packages/account/index.ts` to reflect the new API.
- Update `packages/account/README.md`.

## Expected Code Structure

### Collection Definition (`db.ts`)

```typescript
import { createCollection, localOnlyCollectionOptions } from '@tanstack/react-db';

import { AccountSchema } from '../types';

export const accountCollection = createCollection(
  localOnlyCollectionOptions({
    schema: AccountSchema,
    queryKey: ['accounts'],
    getKey: item => item.id,
  })
);
```

### Domain Hook (`hooks/use-db-account.ts`)

```typescript
import { useLiveQuery } from '@tanstack/react-db';

import { accountCollection } from '../db';

export function useDbAccount(id?: string) {
  const { data: account, isLoading } = useLiveQuery(
    q => {
      let query = q.from({ items: accountCollection });
      if (id) {
        query = query.where(({ items }) => eq(items.id, id));
      }
      return query;
    },
    [id]
  );

  return {
    account: account?.[0],
    isLoading,
    insert: item => accountCollection.insert(item),
    update: (id, updates) => accountCollection.update({ id, ...updates }),
    delete: id => accountCollection.delete(id),
  };
}
```

### Auth Hook (`hooks/use-auth.ts`)

```typescript
import { useEffect, useState } from 'react';

import supabase from '@/supabase/client';
import { User } from '@/types/user';

export function useAuth() {
  const [user, setUser] = useState<User | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? undefined);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? undefined);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user };
}
```

### Storage Hook (`hooks/use-storage.ts`)

```typescript
import { useCallback } from 'react';

import supabase from '@/supabase/client';

export function useStorage() {
  const uploadFile = useCallback(async (userId: string, file: File) => {
    const fileName = `${userId}/${file.name}`;
    const { data, error } = await supabase.storage.from('documents').upload(fileName, file, {
      cacheControl: 'no-cache',
      upsert: true,
    });
    if (error) throw error;
    return data.path;
  }, []);

  const deleteFile = useCallback(async (path: string) => {
    const { error } = await supabase.storage.from('documents').remove([path]);
    if (error) throw error;
  }, []);

  return { uploadFile, deleteFile };
}
```
