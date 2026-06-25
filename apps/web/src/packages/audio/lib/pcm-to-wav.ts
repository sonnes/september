/**
 * Assemble raw 16-bit mono PCM chunks into a WAV file encoded as a
 * `data:audio/wav;base64,...` URI — the form the audio player and storage
 * layer already accept (see audio-player.tsx, which plays any `data:` URI).
 *
 * Used by the ElevenLabs streaming path: PCM chunks arrive over the WebSocket
 * and play live, then the accumulated samples are wrapped as WAV for
 * persistence, replay caching, and the display-popup broadcast.
 */
export function pcmToWavDataUri(chunks: Int16Array[], sampleRate: number): string {
  const sampleCount = chunks.reduce((n, c) => n + c.length, 0);
  const dataLen = sampleCount * 2; // 16-bit
  const buffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // audio format: PCM
  view.setUint16(22, 1, true); // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (mono, 16-bit)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, dataLen, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++, offset += 2) {
      view.setInt16(offset, chunk[i], true);
    }
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}
