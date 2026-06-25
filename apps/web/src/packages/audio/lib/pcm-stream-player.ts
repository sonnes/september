/** Convert little-endian 16-bit PCM samples to Web Audio's Float32 range. */
export function int16ToFloat32(int16: Int16Array): Float32Array {
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    // 32768 (not 32767) so -32768 maps exactly to -1 and there's no clipping.
    out[i] = int16[i] / 32768;
  }
  return out;
}

/**
 * Gapless live player for streamed 16-bit mono PCM chunks. Each `push` decodes
 * a chunk to an `AudioBuffer` and schedules it back-to-back on a running clock,
 * so audio starts on the first chunk instead of waiting for the full file.
 *
 * Used only for live main-window playback of the ElevenLabs WebSocket stream;
 * stored/replayed audio still goes through the `<audio>`-based AudioPlayer.
 */
export class PcmStreamPlayer {
  private ctx: AudioContext;
  private sampleRate: number;
  private nextStartTime = 0;
  private scheduled = 0;
  private finishedScheduling = false;
  private stopped = false;
  /** Fires once after the last scheduled chunk finishes playing. */
  onEnded?: () => void;

  constructor(sampleRate: number, sinkId?: string) {
    this.sampleRate = sampleRate;
    this.ctx = new AudioContext();
    // Route to the configured output device, mirroring the <audio> setSinkId
    // path. AudioContext.setSinkId is Chrome 110+; absent elsewhere → default.
    if (sinkId && 'setSinkId' in this.ctx) {
      (this.ctx as AudioContext & { setSinkId(id: string): Promise<void> })
        .setSinkId(sinkId)
        .catch(err => console.error('AudioContext.setSinkId failed, using default device:', err));
    }
  }

  push(int16: Int16Array): void {
    if (this.stopped || int16.length === 0) return;

    const buffer = this.ctx.createBuffer(1, int16.length, this.sampleRate);
    buffer.copyToChannel(int16ToFloat32(int16), 0);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    // First chunk (or after an underrun) starts slightly ahead to avoid a glitch.
    if (this.nextStartTime < now) this.nextStartTime = now + 0.05;

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.scheduled++;

    source.onended = () => {
      this.scheduled--;
      if (this.finishedScheduling && this.scheduled === 0 && !this.stopped) {
        this.onEnded?.();
      }
    };
  }

  /** Signal that no more chunks will be pushed; `onEnded` fires when drained. */
  end(): void {
    this.finishedScheduling = true;
    if (this.scheduled === 0 && !this.stopped) this.onEnded?.();
  }

  /** Cancel playback immediately (e.g. before a REST fallback plays). */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.ctx.close().catch(() => {});
  }
}
