/** The files a note exports to, and why one cannot be saved yet. */

import { noteSlug } from "../notes.ts";
import type { SpeechService } from "../voice.ts";

export type ExportKind = "text" | "audio" | "video";

export interface ExportArtifact {
  kind: ExportKind;
  name: string;
  extension: "md" | "mp3" | "mp4";
  /** What the file is for, in one line under the name. */
  hint: string;
}

export const EXPORT_ARTIFACTS: ExportArtifact[] = [
  {
    kind: "text",
    name: "Text",
    extension: "md",
    hint: "The words of the note, to send or to keep.",
  },
  {
    kind: "audio",
    name: "Audio",
    extension: "mp3",
    hint: "The note read in your voice.",
  },
  {
    kind: "video",
    name: "Video",
    extension: "mp4",
    hint: "A story film of the words in your voice.",
  },
];

/** The name of the saved file. It carries the name of the note, never an id. */
export function exportFileName(
  name: string | null | undefined,
  kind: ExportKind,
): string {
  return `${noteSlug(name)}.${EXPORT_ARTIFACTS.find((artifact) => artifact.kind === kind)!.extension}`;
}

export interface ExportReadiness {
  provider: SpeechService;
  voiceId: string | null;
  /** Whether this app can render a video at all. */
  video: boolean;
}

/**
 * Why an artifact cannot be saved yet, or nothing when it can.
 *
 * The words always save, on either app, with no service connected. Anything
 * with a voice in it needs an ElevenLabs voice, because only ElevenLabs returns
 * the timing that a caption needs.
 */
export function exportReason(
  kind: ExportKind,
  { provider, voiceId, video }: ExportReadiness,
): string | null {
  if (kind === "text") return null;
  if (kind === "video" && !video) return "Video comes from the browser app for now.";
  if (provider === "system") return "Uses your ElevenLabs voice.";
  if (!voiceId) return "Choose an ElevenLabs voice first.";
  return null;
}
