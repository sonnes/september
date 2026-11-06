/** A note, saved as a file: the words, the voice, or a story film of both. */

import { platform } from "@platform/adapter";
import { markdownToVoiceText } from "@september/core/rules/notes";
import {
  exportFileName,
  exportReason,
  type ExportKind,
} from "@september/core/rules/present/export";
import type { PresentToneKey } from "@september/core/rules/present/stage";

import type { VideoStage } from "../platform";
import { soundFile, speechSettings } from "./speech";
import { recordExportUsage } from "./usage";

/** Why an artifact cannot be saved yet, or nothing when it can. */
export function exportUnavailable(kind: ExportKind): string | null {
  const { provider, voiceId } = speechSettings();
  return exportReason(kind, { provider, voiceId, video: Boolean(platform.device.renderVideo) });
}

export function saveNoteText(name: string | null | undefined, content: string): void {
  platform.device.save(
    new Blob([content], { type: "text/markdown;charset=utf-8" }),
    exportFileName(name, "text"),
  );
  recordExportUsage("text");
}

export async function saveNoteAudio(
  name: string | null | undefined,
  content: string,
): Promise<void> {
  const { text, voice } = soundFile(markdownToVoiceText(content));
  const sound = await platform.voice.synthesize(text, voice);
  platform.device.save(sound, exportFileName(name, "audio"));
  recordExportUsage("audio");
}

export async function saveNoteVideo(
  name: string | null | undefined,
  content: string,
  tone: PresentToneKey,
  onStage?: (stage: VideoStage) => void,
): Promise<void> {
  const render = platform.device.renderVideo;
  if (!render) throw new Error(exportUnavailable("video") ?? "Video is not available here.");
  onStage?.("voice");
  const film = await render({ ...soundFile(markdownToVoiceText(content)), tone, onStage });
  platform.device.save(film, exportFileName(name, "video"));
  recordExportUsage("video");
}
