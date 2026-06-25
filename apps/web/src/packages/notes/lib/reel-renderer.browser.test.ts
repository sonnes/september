import { describe, expect, it, vi } from 'vitest';

import { computePretextLayout } from '@/packages/audio/hooks/use-pretext-layout';

import type { ReelCaption } from './reel';
import type { ReelFfmpeg } from './reel-renderer.browser';
import {
  buildWasmFfmpegArgs,
  dataUriToUint8Array,
  layoutCaption,
  renderNoteReelVideoWithWasm,
} from './reel-renderer.browser';

vi.mock('@/packages/audio/hooks/use-pretext-layout', () => ({
  computePretextLayout: vi.fn(({ text }: { text: string }) => ({
    fontSize: 84,
    totalHeight: 100,
    lines: [{ text, width: 200, y: 0 }],
  })),
}));

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

describe('layoutCaption', () => {
  const caption: ReelCaption = {
    startTime: 0,
    endTime: 1,
    words: [
      { text: 'Hello', startTime: 0, endTime: 0.5 },
      { text: 'world', startTime: 0.5, endTime: 1 },
    ],
  };

  it('sizes via pretext (not a hardcoded font) and maps words onto lines', () => {
    const layout = layoutCaption(caption, 1080, 1920);

    expect(layout.fontSize).toBe(84);
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0].words.map(w => w.text)).toEqual(['Hello', 'world']);
    expect(layout.lines[0].words.map(w => w.index)).toEqual([0, 1]);
  });

  it('continues global word indices across wrapped lines', () => {
    vi.mocked(computePretextLayout).mockReturnValueOnce({
      fontSize: 60,
      totalHeight: 200,
      lines: [
        { text: 'one two', width: 100, y: 0 },
        { text: 'three', width: 80, y: 1 },
      ],
    });

    const longCaption: ReelCaption = {
      startTime: 0,
      endTime: 1,
      words: [
        { text: 'one', startTime: 0, endTime: 0.3 },
        { text: 'two', startTime: 0.3, endTime: 0.6 },
        { text: 'three', startTime: 0.6, endTime: 1 },
      ],
    };

    const layout = layoutCaption(longCaption, 1080, 1920);

    expect(layout.lines.map(line => line.words.map(w => w.index))).toEqual([[0, 1], [2]]);
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
