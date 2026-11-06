const MB = 1024 * 1024;

/** The largest sample ElevenLabs takes, and the largest set of samples. */
export const CLONE_LIMITS = { sampleBytes: 25 * MB, totalBytes: 100 * MB } as const;

const megabytes = (bytes: number) => `${bytes / MB} MB`;

/** The limits, as the upload area states them. */
export const CLONE_LIMITS_TEXT = `up to ${megabytes(CLONE_LIMITS.sampleBytes)} per file and ${megabytes(CLONE_LIMITS.totalBytes)} total`;

type VoiceSampleFile = { name: string; size: number; type: string };

/** The one problem the form must fix before it calls ElevenLabs, or null. */
export function validateVoiceClone({
  files,
  name,
}: {
  files: readonly VoiceSampleFile[];
  name: string;
}): string | null {
  if (files.length === 0) return "Add at least one voice sample.";
  if (!name.trim()) return "Give this voice a name.";

  for (const file of files) {
    if (file.type && !file.type.startsWith("audio/")) {
      return `${file.name} is not an audio file.`;
    }
    if (file.size > CLONE_LIMITS.sampleBytes) {
      return `${file.name} is larger than ${megabytes(CLONE_LIMITS.sampleBytes)}.`;
    }
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > CLONE_LIMITS.totalBytes) {
    return `Voice samples are larger than ${megabytes(CLONE_LIMITS.totalBytes)} in total.`;
  }
  return null;
}
