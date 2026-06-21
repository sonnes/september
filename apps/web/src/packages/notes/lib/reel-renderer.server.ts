import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';

import type { ReelCaption } from './reel';

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;

export interface RenderNoteReelVideoInput {
  audioDataUri: string;
  captions: ReelCaption[];
  durationSeconds: number;
}

export interface RenderNoteReelVideoResult {
  base64: string;
  contentType: 'video/mp4';
}

export interface RunFfmpegInput {
  args: string[];
  outputPath: string;
}

export interface RenderNoteReelVideoOptions {
  baseDir?: string;
  ffmpegPath?: string;
  runFfmpeg?: (input: RunFfmpegInput) => Promise<void>;
}

interface BuildFfmpegArgsInput {
  audioPath: string;
  framesPath: string;
  outputPath: string;
  durationSeconds: number;
}

interface FrameSpec {
  caption?: ReelCaption;
  activeWordIndex?: number;
  durationSeconds: number;
}

export function dataUriToBuffer(dataUri: string): { buffer: Buffer; contentType: string } {
  const match = dataUri.match(/^data:([^;,]+);base64,(.*)$/);

  if (!match) {
    return { buffer: Buffer.from(dataUri, 'base64'), contentType: 'audio/mp3' };
  }

  return {
    buffer: Buffer.from(match[2], 'base64'),
    contentType: match[1],
  };
}

function audioExtension(contentType: string): string {
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3';
  if (contentType.includes('mp4')) return 'm4a';
  return 'mp3';
}

export function buildFfmpegArgs({
  audioPath,
  framesPath,
  outputPath,
  durationSeconds,
}: BuildFfmpegArgsInput): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    framesPath,
    '-i',
    audioPath,
    '-t',
    Math.max(0.1, durationSeconds + 0.2).toFixed(2),
    '-fps_mode',
    'vfr',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ];
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeConcatPath(path: string): string {
  return path.replace(/'/g, "'\\''");
}

function splitCaptionLines(caption: ReelCaption): Array<Array<{ text: string; index: number }>> {
  const lines: Array<Array<{ text: string; index: number }>> = [];
  let current: Array<{ text: string; index: number }> = [];
  let currentLength = 0;

  caption.words.forEach((word, index) => {
    const nextLength = currentLength + word.text.length + (current.length ? 1 : 0);
    if (current.length && nextLength > 20) {
      lines.push(current);
      current = [];
      currentLength = 0;
    }

    current.push({ text: word.text, index });
    currentLength += word.text.length + (current.length > 1 ? 1 : 0);
  });

  if (current.length) lines.push(current);
  return lines.slice(0, 4);
}

export function frameSvg(caption?: ReelCaption, activeWordIndex = -1): string {
  const lines = caption ? splitCaptionLines(caption) : [];
  const firstY = Math.round(VIDEO_HEIGHT / 2 - ((lines.length - 1) * 112) / 2);

  const textLines = lines
    .map((line, lineIndex) => {
      const tspans = line
        .map((word, wordIndex) => {
          const fill = word.index === activeWordIndex ? '#fbbf24' : '#ffffff';
          const opacity = activeWordIndex >= 0 && word.index < activeWordIndex ? '0.62' : '1';
          const dx = wordIndex === 0 ? '0' : '22';
          return `<tspan dx="${dx}" fill="${fill}" opacity="${opacity}">${escapeXml(word.text)}</tspan>`;
        })
        .join('');

      return `<text x="${VIDEO_WIDTH / 2}" y="${firstY + lineIndex * 112}" text-anchor="middle" dominant-baseline="middle" font-family="Noto Sans, Arial, sans-serif" font-size="84" font-weight="700">${tspans}</text>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" viewBox="0 0 ${VIDEO_WIDTH} ${VIDEO_HEIGHT}">
  <defs>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="48" stroke="#ffffff" stroke-opacity="0.05" stroke-width="2" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="#111827" />
  <rect width="100%" height="100%" fill="url(#grid)" />
  <rect width="100%" height="100%" fill="#18181b" opacity="0.18" />
  <g>${textLines}</g>
  <text x="90" y="1770" font-family="Noto Sans, Arial, sans-serif" font-size="34" font-weight="600" fill="#ffffff" opacity="0.78">September</text>
</svg>`;
}

function frameSpecs(captions: ReelCaption[], durationSeconds: number): FrameSpec[] {
  const specs: FrameSpec[] = [];
  let cursor = 0;

  for (const caption of captions) {
    if (caption.startTime > cursor) {
      specs.push({ durationSeconds: caption.startTime - cursor });
    }

    caption.words.forEach((word, index) => {
      const next = caption.words[index + 1];
      const endTime = next?.startTime ?? caption.endTime;
      const duration = Math.max(0.05, endTime - word.startTime);
      specs.push({ caption, activeWordIndex: index, durationSeconds: duration });
    });

    cursor = caption.endTime;
  }

  if (durationSeconds > cursor) {
    specs.push({ durationSeconds: durationSeconds - cursor });
  }

  return specs.length ? specs : [{ durationSeconds }];
}

async function writeFrameSequence({
  captions,
  durationSeconds,
  workDir,
}: {
  captions: ReelCaption[];
  durationSeconds: number;
  workDir: string;
}): Promise<string> {
  const specs = frameSpecs(captions, durationSeconds);
  const listPath = join(workDir, 'frames.txt');
  const lines: string[] = [];
  let lastFramePath = '';

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const framePath = join(workDir, `frame-${i.toString().padStart(4, '0')}.png`);
    await sharp(Buffer.from(frameSvg(spec.caption, spec.activeWordIndex)))
      .png()
      .toFile(framePath);

    lines.push(`file '${escapeConcatPath(framePath)}'`);
    lines.push(`duration ${spec.durationSeconds.toFixed(3)}`);
    lastFramePath = framePath;
  }

  if (lastFramePath) {
    lines.push(`file '${escapeConcatPath(lastFramePath)}'`);
  }

  await writeFile(listPath, `${lines.join('\n')}\n`, 'utf8');
  return listPath;
}

async function runFfmpegProcess(ffmpegPath: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

export async function renderNoteReelVideo(
  input: RenderNoteReelVideoInput,
  options: RenderNoteReelVideoOptions = {}
): Promise<RenderNoteReelVideoResult> {
  if (!input.captions.length) {
    throw new Error('Caption timing is required');
  }

  if (input.durationSeconds <= 0 || input.durationSeconds > 180) {
    throw new Error('Reel duration must be between 0 and 180 seconds');
  }

  const { buffer, contentType } = dataUriToBuffer(input.audioDataUri);
  if (buffer.byteLength === 0) {
    throw new Error('Audio data is required');
  }

  const workDir = await mkdtemp(join(options.baseDir ?? tmpdir(), 'september-reel-'));
  const audioPath = join(workDir, `audio.${audioExtension(contentType)}`);
  const outputPath = join(workDir, 'reel.mp4');

  try {
    await writeFile(audioPath, buffer);
    const framesPath = await writeFrameSequence({
      captions: input.captions,
      durationSeconds: input.durationSeconds,
      workDir,
    });

    const args = buildFfmpegArgs({
      audioPath,
      framesPath,
      outputPath,
      durationSeconds: input.durationSeconds,
    });

    if (options.runFfmpeg) {
      await options.runFfmpeg({ args, outputPath });
    } else {
      await runFfmpegProcess(options.ffmpegPath ?? 'ffmpeg', args);
    }

    const mp4 = await readFile(outputPath);
    return {
      base64: mp4.toString('base64'),
      contentType: 'video/mp4',
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
