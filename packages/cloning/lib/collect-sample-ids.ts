/**
 * Merge uploaded file IDs and recorded sample IDs into a single de-duplicated list.
 *
 * Previously form.tsx used:
 *   fileIds = uploadedFiles.length > 0 ? uploadedFiles : Object.values(recordings);
 *
 * That silently dropped recordings whenever any upload was present. ElevenLabs
 * accepts multiple samples and produces better clones with more data, so we want all.
 */
export function collectSampleIds(
  uploadedFiles: string[],
  recordings: Record<string, string>
): string[] {
  const all = [...uploadedFiles, ...Object.values(recordings)];
  return [...new Set(all)];
}
