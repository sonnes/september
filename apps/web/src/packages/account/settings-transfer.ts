import { z } from 'zod';

import { AccountSchema, type Account, type AccountUpdate } from './schema';

export type AccountSettingsImportMode = 'merge' | 'overwrite';

const AccountSettingsSchema = AccountSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

const AccountSettingsExportSchema = z
  .object({
    app: z.literal('september'),
    type: z.literal('settings'),
    version: z.literal(1),
    exported_at: z.string().datetime(),
    settings: AccountSettingsSchema,
  })
  .strict();

type AccountSettingsExport = z.infer<typeof AccountSettingsExportSchema>;

const EMPTY_OVERWRITE_SETTINGS: AccountUpdate = {
  context: undefined,
  city: undefined,
  country: undefined,
  primary_diagnosis: undefined,
  year_of_diagnosis: undefined,
  medical_document_path: undefined,
};

export function buildAccountSettingsExport(account: Account): AccountSettingsExport {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...settings } = account;

  return {
    app: 'september',
    type: 'settings',
    version: 1,
    exported_at: new Date().toISOString(),
    settings: AccountSettingsSchema.parse(settings),
  };
}

export function serializeAccountSettingsExport(account: Account): string {
  return JSON.stringify(buildAccountSettingsExport(account), null, 2);
}

export function parseAccountSettingsExport(json: string): AccountUpdate {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Settings import must be valid JSON.');
  }

  const result = AccountSettingsExportSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error('Settings import is not a September settings export.');
  }

  return result.data.settings;
}

export function resolveAccountSettingsImport({
  current,
  imported,
  mode,
}: {
  current: Account;
  imported: AccountUpdate;
  mode: AccountSettingsImportMode;
}): AccountUpdate {
  if (mode === 'overwrite') {
    return {
      ...EMPTY_OVERWRITE_SETTINGS,
      ...imported,
    };
  }

  return mergeSettings(toAccountUpdate(current), imported);
}

function toAccountUpdate(account: Account): AccountUpdate {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...settings } = account;
  return settings;
}

function mergeSettings<T extends Record<string, unknown>>(current: T, imported: Partial<T>): T {
  const merged = { ...current };

  for (const [key, importedValue] of Object.entries(imported)) {
    if (importedValue === undefined) continue;

    const currentValue = merged[key];

    merged[key as keyof T] =
      isPlainObject(currentValue) && isPlainObject(importedValue)
        ? mergeSettings(currentValue, importedValue)
        : (importedValue as T[keyof T]);
  }

  return merged;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
