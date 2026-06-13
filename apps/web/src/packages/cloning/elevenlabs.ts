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

export async function cloneVoice(
  apiKey: string,
  opts: { files: File[]; name: string; description?: string }
): Promise<{ voice_id: string; name: string }> {
  if (!apiKey) throw new Error('ElevenLabs API key is required');
  if (opts.files.length === 0) throw new Error('At least one audio file is required');

  const formData = new FormData();
  opts.files.forEach(file => formData.append('files', file));
  formData.append('name', opts.name);
  if (opts.description) formData.append('description', opts.description);
  formData.append('labels', JSON.stringify({ app: 'september' }));

  const response = await fetch(`${ELEVENLABS_BASE}/v1/voices/add`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) throw new Error(await parseElevenLabsError(response));

  const data = await response.json();
  return { voice_id: data.voice_id, name: data.name || opts.name };
}

export async function findSimilarVoices(apiKey: string, files: File[]): Promise<SimilarVoice[]> {
  if (!apiKey) throw new Error('ElevenLabs API key is required');
  if (files.length === 0) throw new Error('At least one audio file is required');

  const formData = new FormData();
  files.forEach(file => formData.append('audio_samples', file));

  const response = await fetch(`${ELEVENLABS_BASE}/v1/voices/similar`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: formData,
  });

  if (!response.ok) throw new Error(await parseElevenLabsError(response));

  const data = await response.json();
  return data.voices ?? [];
}
