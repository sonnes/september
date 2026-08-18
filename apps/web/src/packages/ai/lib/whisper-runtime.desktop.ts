export async function transcribeLocally(_audio: Blob): Promise<never> {
  throw new Error('Browser-local Whisper is unavailable in the desktop app.');
}
