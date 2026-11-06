import { platform } from "@platform/adapter";
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  backupContents,
  backupContentsFrom,
  backupFileName,
  encodeBackup,
  storedBackupFrom,
  type SeptemberBackup,
} from "@september/core/rules/backup";

import { currentUserId } from "./settings";

export async function downloadBackup(): Promise<void> {
  const at = new Date();
  const contents = backupContentsFrom(await platform.store.exportBackup(), currentUserId());
  platform.device.save(
    new Blob(
      [
        encodeBackup({
          format: BACKUP_FORMAT,
          formatVersion: BACKUP_FORMAT_VERSION,
          exportedAt: at.toISOString(),
          source: platform.app.source,
          appVersion: platform.app.version,
          ...contents,
        }),
      ],
      { type: "application/json;charset=utf-8" },
    ),
    backupFileName(at),
  );
}

/** Replaces the data of the app with a backup, then starts the app again. */
export async function importBackup(backup: SeptemberBackup): Promise<void> {
  await platform.store.importBackup(storedBackupFrom(backupContents(backup)));
  window.location.reload();
}
