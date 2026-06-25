import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ElevenLabsWsConnection } from './elevenlabs-ws-connection';

class FakeWS extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWS[] = [];

  url: string;
  readyState = 0;

  constructor(url: string) {
    super();
    this.url = url;
    FakeWS.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }
  close() {
    this.readyState = 3;
  }
  send() {}
}

const tick = () => new Promise(r => setTimeout(r, 0));

const A = { voiceId: 'voice-a', modelId: 'eleven_flash_v2_5', outputFormat: 'pcm_22050' };
const B = { voiceId: 'voice-b', modelId: 'eleven_flash_v2_5', outputFormat: 'pcm_22050' };

describe('ElevenLabsWsConnection', () => {
  beforeEach(() => {
    FakeWS.instances = [];
    vi.stubGlobal('WebSocket', FakeWS);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens a socket and returns it once OPEN', async () => {
    const conn = new ElevenLabsWsConnection();
    const promise = conn.acquire(A);
    FakeWS.instances[0].open();
    const ws = await promise;
    expect((ws as unknown as FakeWS).readyState).toBe(FakeWS.OPEN);
    expect((ws as unknown as FakeWS).url).toContain('voice-a');
    expect((ws as unknown as FakeWS).url).toContain('output_format=pcm_22050');
    conn.dispose();
  });

  it('reuses a warm socket when one is OPEN (health check passes)', async () => {
    const conn = new ElevenLabsWsConnection();
    conn.prewarm(A);
    FakeWS.instances[0].open();
    await tick();

    const ws = await conn.acquire(A);
    expect(ws).toBe(FakeWS.instances[0]); // reused, not reopened
    conn.dispose();
  });

  it('reopens when the warm socket is not OPEN', async () => {
    const conn = new ElevenLabsWsConnection();
    conn.prewarm(A);
    FakeWS.instances[0].open();
    await tick();
    FakeWS.instances[0].close(); // idle timeout / dead

    const promise = conn.acquire(A);
    // acquire must open a fresh socket rather than hand back the dead one
    const fresh = FakeWS.instances[FakeWS.instances.length - 1];
    expect(fresh).not.toBe(FakeWS.instances[0]);
    fresh.open();
    const ws = await promise;
    expect(ws).toBe(fresh);
    conn.dispose();
  });

  it('drops a stale warm socket on window focus', async () => {
    const conn = new ElevenLabsWsConnection();
    conn.prewarm(A);
    FakeWS.instances[0].open();
    await tick();
    FakeWS.instances[0].close();

    window.dispatchEvent(new Event('focus'));

    const promise = conn.acquire(A);
    const fresh = FakeWS.instances[FakeWS.instances.length - 1];
    expect(fresh).not.toBe(FakeWS.instances[0]);
    fresh.open();
    await promise;
    conn.dispose();
  });

  it('reopens for a different voice/model (params change)', async () => {
    const conn = new ElevenLabsWsConnection();
    conn.prewarm(A);
    FakeWS.instances[0].open();
    await tick();

    const promise = conn.acquire(B);
    const fresh = FakeWS.instances[FakeWS.instances.length - 1];
    expect(fresh.url).toContain('voice-b');
    fresh.open();
    const ws = await promise;
    expect((ws as unknown as FakeWS).url).toContain('voice-b');
    conn.dispose();
  });
});
