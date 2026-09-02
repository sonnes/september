import { invoke } from "@tauri-apps/api/core";

import {
  backupContents,
  backupFileName,
  encodeBackup,
  type BackupContents,
  type SeptemberBackup,
} from "@september/core/rules/backup";

import packageMetadata from "../../package.json";
import { save } from "./export";

export async function downloadBackup(): Promise<void> {
  const at = new Date();
  const contents = await invoke<BackupContents>("backup_export");
  save(
    new Blob(
      [
        encodeBackup({
          format: "september-backup",
          formatVersion: 2,
          exportedAt: at.toISOString(),
          source: "desktop",
          appVersion: packageMetadata.version,
          ...contents,
        }),
      ],
      { type: "application/json;charset=utf-8" },
    ),
    backupFileName(at),
  );
}

export async function importBackup(backup: SeptemberBackup): Promise<void> {
  await invoke<void>("backup_import", { request: backupContents(backup) });
  window.location.reload();
}
