import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildFfmpegArgs,
  dataUriToBuffer,
  frameSvg,
  renderNoteReelVideo,
} from './reel-renderer.server';

describe('dataUriToBuffer', () => {
  it('decodes data URI audio payloads', () => {
    const result = dataUriToBuffer('data:audio/mp3;base64,QUJD');

    expect(result.contentType).toBe('audio/mp3');
    expect(result.buffer.toString('utf8')).toBe('ABC');
  });

  it('accepts bare base64 as mp3', () => {
    const result = dataUriToBuffer('QUJD');

    expect(result.contentType).toBe('audio/mp3');
    expect(result.buffer.toString('utf8')).toBe('ABC');
  });
});

describe('buildFfmpegArgs', () => {
  it('builds a vertical mp4 command', () => {
    const args = buildFfmpegArgs({
      audioPath: '/tmp/audio.mp3',
      framesPath: '/tmp/frames.txt',
      outputPath: '/tmp/out.mp4',
      durationSeconds: 12.4,
    });

    expect(args).toContain('concat');
    expect(args).toContain('/tmp/frames.txt');
    expect(args).toContain('/tmp/audio.mp3');
    expect(args).toContain('/tmp/out.mp4');
  });
});

describe('frameSvg', () => {
  it('renders escaped caption text and current-word color', () => {
    const svg = frameSvg(
      {
        startTime: 0,
        endTime: 1,
        words: [
          { text: 'Hello', startTime: 0, endTime: 0.5 },
          { text: '<world>', startTime: 0.5, endTime: 1 },
        ],
      },
      1
    );

    expect(svg).toContain('Hello');
    expect(svg).toContain('&lt;world&gt;');
    expect(svg).toContain('#fbbf24');
  });
});

describe('renderNoteReelVideo', () => {
  it('writes audio and captions, runs ffmpeg, and returns mp4 base64', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'september-reel-test-'));
    const calls: string[][] = [];

    const result = await renderNoteReelVideo(
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
        baseDir,
        runFfmpeg: async ({ args, outputPath }) => {
          calls.push(args);
          await writeFile(outputPath, Buffer.from('mp4'));
        },
      }
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('-fps_mode');
    expect(result.contentType).toBe('video/mp4');
    expect(result.base64).toBe('bXA0');

    await rm(baseDir, { recursive: true, force: true });
  });
});
