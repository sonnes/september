import {
  backupContents,
  backupFileName,
  encodeBackup,
  type SeptemberBackup,
} from '@september/core/rules/backup';

import packageMetadata from '../../package.json';
import { save } from './export';
import { getRepository } from './repository';

export async function downloadBackup(): Promise<void> {
  const at = new Date();
  const contents = await (await getRepository()).backupContents();
  save(
    new Blob(
      [
        encodeBackup({
          format: 'september-backup',
          formatVersion: 2,
          exportedAt: at.toISOString(),
          source: 'web',
          appVersion: packageMetadata.version,
          ...contents,
        }),
      ],
      { type: 'application/json;charset=utf-8' }
    ),
    backupFileName(at)
  );
}

export async function importBackup(backup: SeptemberBackup): Promise<void> {
  await (await getRepository()).replaceBackupContents(backupContents(backup));
  window.location.reload();
}
