/**
 * Unit + regression tests for ElevenLabsVoiceClone
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ElevenLabsVoiceClone } from './elevenlabs-clone';

const makeFile = (name: string, type = 'audio/webm') =>
  new File([new Uint8Array(16)], name, { type });

describe('ElevenLabsVoiceClone', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when api key is empty string', async () => {
    const svc = new ElevenLabsVoiceClone('');
    await expect(svc.cloneVoice({ files: [makeFile('a.webm')], name: 'Test' })).rejects.toThrow(
      'ElevenLabs API key is required'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws when no files are provided', async () => {
    const svc = new ElevenLabsVoiceClone('key-abc');
    await expect(svc.cloneVoice({ files: [], name: 'Test' })).rejects.toThrow(
      'At least one audio file is required'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts multipart to ElevenLabs and returns voice_id + name', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ voice_id: 'v-123', name: 'My Voice' }),
    } as Response);

    const svc = new ElevenLabsVoiceClone('key-abc');
    const result = await svc.cloneVoice({
      files: [makeFile('a.webm'), makeFile('b.webm')],
      name: 'My Voice',
      description: 'Calm tone',
    });

    expect(result.voice_id).toBe('v-123');
    expect(result.name).toBe('My Voice');
    expect(fetch).toHaveBeenCalledOnce();

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/voices/add');
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe('key-abc');
    expect(init.body).toBeInstanceOf(FormData);

    const fd = init.body as FormData;
    expect(fd.get('name')).toBe('My Voice');
    expect(fd.get('description')).toBe('Calm tone');
  });

  it('falls back to request name when response omits name', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ voice_id: 'v-456' }),
    } as Response);

    const svc = new ElevenLabsVoiceClone('key-abc');
    const result = await svc.cloneVoice({ files: [makeFile('a.webm')], name: 'Fallback' });
    expect(result.name).toBe('Fallback');
  });

  it('parses JSON error detail from a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      text: async () => JSON.stringify({ detail: { message: 'File format not supported' } }),
    } as Response);

    const svc = new ElevenLabsVoiceClone('key-abc');
    await expect(
      svc.cloneVoice({ files: [makeFile('a.mp3')], name: 'Test' })
    ).rejects.toThrow('File format not supported');
  });

  it('falls back to raw text when error body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'upstream timeout',
    } as Response);

    const svc = new ElevenLabsVoiceClone('key-abc');
    await expect(
      svc.cloneVoice({ files: [makeFile('a.webm')], name: 'Test' })
    ).rejects.toThrow('upstream timeout');
  });

  it('omits description from FormData when not provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ voice_id: 'v-789', name: 'NoDesc' }),
    } as Response);

    const svc = new ElevenLabsVoiceClone('key-abc');
    await svc.cloneVoice({ files: [makeFile('a.webm')], name: 'NoDesc' });

    const fd = vi.mocked(fetch).mock.calls[0][1]!.body as FormData;
    expect(fd.get('description')).toBeNull();
  });
});
