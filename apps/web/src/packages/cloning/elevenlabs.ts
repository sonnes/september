import { recordApiCall } from '@/packages/usage';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io';

export interface SimilarVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  similarity_score?: number;
}

async function parseElevenLabsError(response: Response): Promise<string> {
  const errorText = await response.text();
  const fallback = `ElevenLabs API error: ${response.status} ${response.statusText}`;
  try {
    const data = JSON.parse(errorText);
    return data.detail?.message || fallback;
  } catch {
    return errorText || fallback;
  }
}

/**
 * Record a cloning call. Cloning consumes an ElevenLabs voice slot rather than
 * metered units, so the event carries no cost — it exists so the usage page can
 * account for every outbound call, not just the priced ones.
 */
async function metered<T>(
  userId: string | undefined,
  call: { clone_kind: 'clone' | 'similar'; sample_count: number },
  run: () => Promise<T>
): Promise<T> {
  if (!userId) return run();

  const startedAt = performance.now();

  try {
    const result = await run();
    recordApiCall(userId, {
      kind: 'clone',
      provider: 'elevenlabs',
      ...call,
      latency_ms: Math.round(performance.now() - startedAt),
      success: true,
    });
    return result;
  } catch (error) {
    recordApiCall(userId, {
      kind: 'clone',
      provider: 'elevenlabs',
      ...call,
      latency_ms: Math.round(performance.now() - startedAt),
      success: false,
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function cloneVoice(
  apiKey: string,
  opts: { files: File[]; name: string; description?: string; userId?: string }
): Promise<{ voice_id: string; name: string }> {
  if (!apiKey) throw new Error('ElevenLabs API key is required');
  if (opts.files.length === 0) throw new Error('At least one audio file is required');

  const formData = new FormData();
  opts.files.forEach(file => formData.append('files', file));
  formData.append('name', opts.name);
  if (opts.description) formData.append('description', opts.description);
  formData.append('labels', JSON.stringify({ app: 'september' }));

  return metered(
    opts.userId,
    { clone_kind: 'clone', sample_count: opts.files.length },
    async () => {
      const response = await fetch(`${ELEVENLABS_BASE}/v1/voices/add`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
        body: formData,
      });

      if (!response.ok) throw new Error(await parseElevenLabsError(response));

      const data = await response.json();
      return { voice_id: data.voice_id, name: data.name || opts.name };
    }
  );
}

export async function findSimilarVoices(
  apiKey: string,
  files: File[],
  userId?: string
): Promise<SimilarVoice[]> {
  if (!apiKey) throw new Error('ElevenLabs API key is required');
  if (files.length === 0) throw new Error('At least one audio file is required');

  const formData = new FormData();
  files.forEach(file => formData.append('audio_samples', file));

  return metered(userId, { clone_kind: 'similar', sample_count: files.length }, async () => {
    const response = await fetch(`${ELEVENLABS_BASE}/v1/voices/similar`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData,
    });

    if (!response.ok) throw new Error(await parseElevenLabsError(response));

    const data = await response.json();
    return data.voices ?? [];
  });
}
