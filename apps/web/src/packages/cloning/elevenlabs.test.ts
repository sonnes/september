import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRecordApiCall } = vi.hoisted(() => ({ mockRecordApiCall: vi.fn() }));

vi.mock('@/packages/usage', () => ({ recordApiCall: mockRecordApiCall }));

import { cloneVoice, findSimilarVoices } from './elevenlabs';

const makeFile = (name: string, type = 'audio/webm') =>
  new File([new Uint8Array(16)], name, { type });

describe('cloneVoice', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('throws when api key is empty string', async () => {
    await expect(cloneVoice('', { files: [makeFile('a.webm')], name: 'Test' })).rejects.toThrow('ElevenLabs API key is required');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws when no files are provided', async () => {
    await expect(cloneVoice('key-abc', { files: [], name: 'Test' })).rejects.toThrow('At least one audio file is required');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts multipart to ElevenLabs and returns voice_id + name', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ voice_id: 'v-123', name: 'My Voice' }) } as Response);
    const result = await cloneVoice('key-abc', { files: [makeFile('a.webm'), makeFile('b.webm')], name: 'My Voice', description: 'Calm tone' });
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
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ voice_id: 'v-456' }) } as Response);
    const result = await cloneVoice('key-abc', { files: [makeFile('a.webm')], name: 'Fallback' });
    expect(result.name).toBe('Fallback');
  });

  it('parses JSON error detail from a non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 422, statusText: 'Unprocessable Entity', text: async () => JSON.stringify({ detail: { message: 'File format not supported' } }) } as Response);
    await expect(cloneVoice('key-abc', { files: [makeFile('a.mp3')], name: 'Test' })).rejects.toThrow('File format not supported');
  });

  it('falls back to raw text when error body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error', text: async () => 'upstream timeout' } as Response);
    await expect(cloneVoice('key-abc', { files: [makeFile('a.webm')], name: 'Test' })).rejects.toThrow('upstream timeout');
  });

  it('omits description from FormData when not provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ voice_id: 'v-789', name: 'NoDesc' }) } as Response);
    await cloneVoice('key-abc', { files: [makeFile('a.webm')], name: 'NoDesc' });
    const fd = vi.mocked(fetch).mock.calls[0][1]!.body as FormData;
    expect(fd.get('description')).toBeNull();
  });
});

describe('findSimilarVoices', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('throws when api key is empty string', async () => {
    await expect(findSimilarVoices('', [makeFile('a.webm')])).rejects.toThrow('ElevenLabs API key is required');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('throws when no files are provided', async () => {
    await expect(findSimilarVoices('key-abc', [])).rejects.toThrow('At least one audio file is required');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts multipart to /v1/voices/similar and returns voices array', async () => {
    const fakeVoices = [{ voice_id: 'v-1', name: 'Voice A', category: 'premade', description: 'desc', preview_url: 'http://x' }];
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ voices: fakeVoices }) } as Response);
    const result = await findSimilarVoices('key-abc', [makeFile('a.webm')]);
    expect(result).toEqual(fakeVoices);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/v1/voices/similar');
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe('key-abc');
    const fd = init.body as FormData;
    expect(fd.get('audio_samples')).toBeTruthy();
  });

  it('returns empty array when response voices is missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    const result = await findSimilarVoices('key-abc', [makeFile('a.webm')]);
    expect(result).toEqual([]);
  });

  it('parses error from non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized', text: async () => JSON.stringify({ detail: { message: 'Invalid API key' } }) } as Response);
    await expect(findSimilarVoices('key-abc', [makeFile('a.webm')])).rejects.toThrow('Invalid API key');
  });
});

describe('metering', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    mockRecordApiCall.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records a successful clone against the user', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ voice_id: 'v-123', name: 'My Voice' }),
    } as Response);

    await cloneVoice('key-abc', {
      files: [makeFile('a.webm'), makeFile('b.webm')],
      name: 'My Voice',
      userId: 'user-1',
    });

    expect(mockRecordApiCall).toHaveBeenCalledOnce();
    const [userId, call] = mockRecordApiCall.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(call).toMatchObject({
      kind: 'clone',
      provider: 'elevenlabs',
      clone_kind: 'clone',
      sample_count: 2,
      success: true,
    });
  });

  it('records a rejected clone, keeping the reason', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ detail: { message: 'Invalid API key' } }),
    } as Response);

    await expect(
      cloneVoice('key-abc', { files: [makeFile('a.webm')], name: 'X', userId: 'user-1' })
    ).rejects.toThrow('Invalid API key');

    const [, call] = mockRecordApiCall.mock.calls[0];
    expect(call.success).toBe(false);
    expect(call.error_message).toBe('Invalid API key');
  });

  it('records a similar-voice search under its own kind', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ voices: [] }),
    } as Response);

    await findSimilarVoices('key-abc', [makeFile('a.webm')], 'user-1');

    const [, call] = mockRecordApiCall.mock.calls[0];
    expect(call.clone_kind).toBe('similar');
    expect(call.sample_count).toBe(1);
  });

  it('records nothing when there is no signed-in user', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ voice_id: 'v-1' }),
    } as Response);

    await cloneVoice('key-abc', { files: [makeFile('a.webm')], name: 'X' });

    expect(mockRecordApiCall).not.toHaveBeenCalled();
  });
});
