import { z } from 'zod';

import { AccountSchema, type Account, type AccountUpdate } from './schema';

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
