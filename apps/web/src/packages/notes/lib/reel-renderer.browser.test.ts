import { describe, expect, it, vi } from 'vitest';

import type { ReelFfmpeg } from './reel-renderer.browser';
import {
  buildWasmFfmpegArgs,
  dataUriToUint8Array,
  renderNoteReelVideoWithWasm,
} from './reel-renderer.browser';

describe('dataUriToUint8Array', () => {
  it('decodes data URI audio payloads', () => {
    const bytes = dataUriToUint8Array('data:audio/mp3;base64,QUJD');

    expect(new TextDecoder().decode(bytes)).toBe('ABC');
  });

  it('accepts bare base64', () => {
    const bytes = dataUriToUint8Array('QUJD');

    expect(new TextDecoder().decode(bytes)).toBe('ABC');
  });
});

describe('buildWasmFfmpegArgs', () => {
  it('builds a browser ffmpeg concat command', () => {
    const args = buildWasmFfmpegArgs({
      audioPath: 'audio.mp3',
      framesPath: 'frames.txt',
      outputPath: 'reel.mp4',
      durationSeconds: 12.4,
    });

    expect(args).toContain('concat');
    expect(args).toContain('frames.txt');
    expect(args).toContain('audio.mp3');
    expect(args).toContain('reel.mp4');
  });
});

describe('renderNoteReelVideoWithWasm', () => {
  it('writes audio and frame files, runs ffmpeg, and returns an MP4 blob', async () => {
    const writes = new Map<string, Uint8Array>();
    const exec = vi.fn(async () => {
      writes.set('reel.mp4', new TextEncoder().encode('mp4'));
    });
    const ffmpeg: ReelFfmpeg = {
      writeFile: vi.fn(async (path, data) => {
        writes.set(path, data);
      }),
      exec,
      readFile: vi.fn(async path => writes.get(path) ?? new Uint8Array()),
      deleteFile: vi.fn(async () => {}),
    };

    const result = await renderNoteReelVideoWithWasm(
      {
        audioDataUri: 'data:audio/mp3;base64,QUJD',
        captions: [
          {
            startTime: 0,
            endTime: 1,
            words: [{ text: 'Hello', startTime: 0, endTime: 1 }],
          },
        ],
        durationSeconds: 1,
      },
      {
        loadFfmpeg: async () => ffmpeg,
        renderFrame: vi.fn(async () => new Uint8Array([137, 80, 78, 71])),
      }
    );

    expect(exec).toHaveBeenCalledWith(expect.arrayContaining(['-f', 'concat']));
    expect(new TextDecoder().decode(writes.get('frames.txt'))).toContain("file 'frame-0000.png'");
    expect(result.contentType).toBe('video/mp4');
    expect(result.blob.size).toBe(3);
  });
});
