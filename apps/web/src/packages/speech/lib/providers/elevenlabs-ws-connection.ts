const WS_BASE = 'wss://api.elevenlabs.io';

export interface WsConnectionParams {
  voiceId: string;
  modelId: string;
  /** e.g. `pcm_22050` — fixes the URL/query, so it's keyed into the warm socket. */
  outputFormat: string;
}

/**
 * Keeps one **warm** stream-input WebSocket pre-opened so each speak skips the
 * TLS+WS handshake. A socket is single-use (the server closes it after we send
 * EOS), so `acquire` hands out the warm socket and immediately pre-opens the
 * next one.
 *
 * Health: `acquire` only reuses a warm socket whose `readyState === OPEN`,
 * otherwise it opens a fresh one — so an idle-timed-out socket never causes a
 * failed utterance. Focus: backgrounded tabs get their sockets suspended, so on
 * `focus`/`visibilitychange` a stale warm socket is dropped and the next
 * `acquire` reopens cleanly.
 */
export class ElevenLabsWsConnection {
  private warm: WebSocket | null = null;
  private warmKey: string | null = null;
  private disposed = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.onFocus);
      document.addEventListener('visibilitychange', this.onFocus);
    }
  }

  private keyOf(p: WsConnectionParams): string {
    return `${p.voiceId}|${p.modelId}|${p.outputFormat}`;
  }

  private buildUrl(p: WsConnectionParams): string {
    const q = new URLSearchParams({
      model_id: p.modelId,
      output_format: p.outputFormat,
      sync_alignment: 'true',
      auto_mode: 'true',
      inactivity_timeout: '120',
    });
    return `${WS_BASE}/v1/text-to-speech/${p.voiceId}/stream-input?${q.toString()}`;
  }

  private open(p: WsConnectionParams): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.buildUrl(p));
      const onOpen = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onErr);
        resolve(ws);
      };
      const onErr = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onErr);
        reject(new Error('ElevenLabs WS failed to open'));
      };
      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onErr);
    });
  }

  private discardWarm(): void {
    if (this.warm) {
      try {
        this.warm.close();
      } catch {
        /* already closed */
      }
    }
    this.warm = null;
    this.warmKey = null;
  }

  /** Pre-open a socket for these params so the next `acquire` is instant. */
  prewarm(p: WsConnectionParams): void {
    if (this.disposed) return;
    const key = this.keyOf(p);
    // A matching socket that's still connecting or open is good enough.
    if (this.warm && this.warmKey === key && this.warm.readyState <= WebSocket.OPEN) return;

    this.discardWarm();
    this.warmKey = key;
    this.open(p)
      .then(ws => {
        if (this.disposed || this.warmKey !== key) {
          try {
            ws.close();
          } catch {
            /* noop */
          }
          return;
        }
        this.warm = ws;
      })
      .catch(() => {
        if (this.warmKey === key) {
          this.warm = null;
          this.warmKey = null;
        }
      });
  }

  /**
   * Return an OPEN socket for these params. The caller drives BOS/text/EOS;
   * the socket is spent afterward (server closes it).
   */
  async acquire(p: WsConnectionParams): Promise<WebSocket> {
    if (this.disposed) throw new Error('ElevenLabs WS connection disposed');
    const key = this.keyOf(p);

    if (this.warm && this.warmKey === key && this.warm.readyState === WebSocket.OPEN) {
      const ws = this.warm;
      this.warm = null;
      this.warmKey = null;
      this.prewarm(p); // ready the next one
      return ws;
    }

    this.discardWarm();
    const ws = await this.open(p);
    this.prewarm(p);
    return ws;
  }

  private onFocus = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    // Drop a warm socket that the browser suspended/closed while backgrounded.
    if (this.warm && this.warm.readyState > WebSocket.OPEN) {
      this.warm = null;
      this.warmKey = null;
    }
  };

  dispose(): void {
    this.disposed = true;
    this.discardWarm();
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.onFocus);
      document.removeEventListener('visibilitychange', this.onFocus);
    }
  }
}
