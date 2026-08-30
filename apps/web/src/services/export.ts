/**
 * A note, saved as a file.
 *
 * Three artifacts, one dialog: the words, the voice, and a story film of both.
 * The words always save — a note is the user's own writing, and no service
 * stands between them and a copy of it.
 */

import { markdownToVoiceText } from '@/rules/notes';
import {
  exportFileName,
  exportReason,
  type ExportKind,
  type PresentToneKey,
} from '@/rules/present';
import { synthesizeSpeech, synthesizeTimed } from '@/services/os';
import { speechSettings } from '@/services/speech';
import { recordExportUsage } from '@/services/usage';
import { renderNoteVideo, type VideoStage } from '@/services/video';

/** The browser renders the film itself, with `ffmpeg.wasm`. */
export const VIDEO_EXPORT = true;

/** Why an artifact cannot be saved yet, or nothing when it can. */
export function exportUnavailable(kind: ExportKind): string | null {
  const { provider, voiceId } = speechSettings();
  return exportReason(kind, { provider, voiceId, video: VIDEO_EXPORT });
}

/** The WebView download support. The file never leaves the machine first. */
export function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function saveNoteText(name: string | null | undefined, content: string): void {
  save(
    new Blob([content], { type: 'text/markdown;charset=utf-8' }),
    exportFileName(name, 'text')
  );
  void recordExportUsage('text');
}

export async function saveNoteAudio(
  name: string | null | undefined,
  content: string
): Promise<void> {
  const settings = speechSettings();
  // The cache is keyed by the words and the voice, so a note read aloud
  // before this saves without asking the service again.
  const { path } = await synthesizeSpeech(markdownToVoiceText(content), settings);
  const sound = await (await fetch(path)).blob();
  save(sound, exportFileName(name, 'audio'));
  void recordExportUsage('audio');
}

export async function saveNoteVideo(
  name: string | null | undefined,
  content: string,
  tone: PresentToneKey,
  onStage?: (stage: VideoStage) => void
): Promise<void> {
  onStage?.('voice');
  const { blob, alignment } = await synthesizeTimed(
    markdownToVoiceText(content),
    speechSettings()
  );
  const film = await renderNoteVideo({ audio: blob, alignment, tone, onStage });
  save(film, exportFileName(name, 'video'));
  void recordExportUsage('video');
}

export type { VideoStage };
