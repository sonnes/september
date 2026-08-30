/**
 * A note, saved as a file.
 *
 * Three artifacts, one dialog: the words, the voice, and a story film of both.
 * The words always save — a note is the user's own writing, and no service
 * stands between them and a copy of it.
 */

import { markdownToVoiceText } from "@/rules/notes";
import {
  exportFileName,
  exportReason,
  type ExportKind,
  type PresentToneKey,
} from "@/rules/present";
import { audioUrl, synthesizeSpeech } from "@/services/os";
import { speechSettings } from "@/services/speech";
import { recordExportUsage } from "@/services/usage";

/**
 * The film is made in the browser app for now.
 *
 * `ffmpeg.wasm` reaches its core through a blob URL, and the script policy of
 * this window allows `'self'` only. Widening it for one export is a poor
 * trade, so the Mac app names the browser instead of hiding the row.
 */
export const VIDEO_EXPORT = false;

export type VideoStage = "voice" | "frames" | "video";

/** Why an artifact cannot be saved yet, or nothing when it can. */
export function exportUnavailable(kind: ExportKind): string | null {
  const { provider, voiceId } = speechSettings();
  return exportReason(kind, { provider, voiceId, video: VIDEO_EXPORT });
}

/** Uses the WebView download support; the file never leaves the Mac first. */
export function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function saveNoteText(
  name: string | null | undefined,
  content: string,
): void {
  save(
    new Blob([content], { type: "text/markdown;charset=utf-8" }),
    exportFileName(name, "text"),
  );
  void recordExportUsage("text");
}

export async function saveNoteAudio(
  name: string | null | undefined,
  content: string,
): Promise<void> {
  const settings = speechSettings();
  // The file is named from the hash of the settings and the words, so a note
  // read aloud before this saves without asking the service again.
  const { path } = await synthesizeSpeech(markdownToVoiceText(content), settings);
  const sound = await (await fetch(audioUrl(path))).blob();
  save(sound, exportFileName(name, "audio"));
  void recordExportUsage("audio");
}

export async function saveNoteVideo(
  _name: string | null | undefined,
  _content: string,
  _tone: PresentToneKey,
  _onStage?: (stage: VideoStage) => void,
): Promise<void> {
  throw new Error(exportUnavailable("video") ?? "Video is not available here.");
}
