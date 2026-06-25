import { computePretextLayout } from '@/packages/audio/hooks/use-pretext-layout';

import type { ReelCaption } from './reel';

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const BACKGROUND_COLOR = '#111827';
const HIGHLIGHT_COLOR = '#fbbf24';
const TEXT_COLOR = '#ffffff';
const CAPTION_FONT_FAMILY = '"Noto Sans"';
const CAPTION_FONT_WEIGHT = '700';
const LINE_HEIGHT_RATIO = 1.2;
const WATERMARK_FONT = '600 34px "Noto Sans", Arial, sans-serif';
const FFMPEG_CORE_VERSION = '0.12.10';
const FFMPEG_CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

export interface RenderNoteReelVideoInput {
  audioDataUri: string;
  captions: ReelCaption[];
  durationSeconds: number;
}

export interface RenderNoteReelVideoResult {
  blob: Blob;
  contentType: 'video/mp4';
}

export interface ReelFfmpeg {
  writeFile(path: string, data: Uint8Array | string): Promise<unknown>;
  exec(args: string[], timeout?: number): Promise<number | unknown>;
  readFile(path: string): Promise<Uint8Array | string>;
  deleteFile?(path: string): Promise<unknown>;
}

export interface BuildWasmFfmpegArgsInput {
  audioPath: string;
  framesPath: string;
  outputPath: string;
  durationSeconds: number;
}

export interface RenderNoteReelVideoOptions {
  loadFfmpeg?: () => Promise<ReelFfmpeg>;
  renderFrame?: (spec: ReelFrameSpec) => Promise<Uint8Array>;
}

interface ReelFrameSpec {
  caption?: ReelCaption;
  activeWordIndex?: number;
  durationSeconds: number;
}

export function dataUriToUint8Array(dataUri: string): Uint8Array {
  const base64 = dataUri.match(/^data:[^;,]+;base64,(.*)$/)?.[1] ?? dataUri;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export function buildWasmFfmpegArgs({
  audioPath,
  framesPath,
  outputPath,
  durationSeconds,
}: BuildWasmFfmpegArgsInput): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
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

interface CaptionLayoutWord {
  text: string;
  index: number;
}

export interface CaptionLayout {
  fontSize: number;
  totalHeight: number;
  lines: Array<{ words: CaptionLayoutWord[] }>;
}

/**
 * Lay out a caption with the shared pretext engine: pick the largest font that
 * fits the frame and word-wrap it, then map each wrapped line back onto the
 * caption's words (preserving order) so the active word can be highlighted.
 * This is the same fit-and-wrap the live preview uses — no fixed font, no
 * char-count line splitting.
 */
export function layoutCaption(caption: ReelCaption, width: number, height: number): CaptionLayout {
  const text = caption.words.map(word => word.text).join(' ');
  const { fontSize, lines, totalHeight } = computePretextLayout({
    text,
    containerWidth: width,
    containerHeight: height,
    fontFamily: CAPTION_FONT_FAMILY,
    fontWeight: CAPTION_FONT_WEIGHT,
    // Captions are drawn without pill backgrounds, so no per-line extra padding.
    lineExtraPx: 0,
    lineGapPx: 0,
  });

  let wordIndex = 0;
  const mappedLines = lines.map(line => ({
    words: line.text
      .split(/\s+/)
      .filter(Boolean)
      .map(token => ({ text: token, index: wordIndex++ })),
  }));

  return { fontSize, totalHeight, lines: mappedLines };
}

function frameSpecs(captions: ReelCaption[], durationSeconds: number): ReelFrameSpec[] {
  const specs: ReelFrameSpec[] = [];
  let cursor = 0;

  for (const caption of captions) {
    if (caption.startTime > cursor) {
      specs.push({ durationSeconds: caption.startTime - cursor });
    }

    caption.words.forEach((word, index) => {
      const next = caption.words[index + 1];
      const endTime = next?.startTime ?? caption.endTime;
      specs.push({
        caption,
        activeWordIndex: index,
        durationSeconds: Math.max(0.05, endTime - word.startTime),
      });
    });

    cursor = caption.endTime;
  }

  if (durationSeconds > cursor) {
    specs.push({ durationSeconds: durationSeconds - cursor });
  }

  return specs.length ? specs : [{ durationSeconds }];
}

function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(VIDEO_WIDTH / 2, VIDEO_HEIGHT / 2);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;

  for (let x = -VIDEO_HEIGHT; x < VIDEO_HEIGHT; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, -VIDEO_HEIGHT);
    ctx.lineTo(x, VIDEO_HEIGHT);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  layout: CaptionLayout,
  activeWordIndex: number
): void {
  if (!layout.fontSize) return;

  const lineHeight = Math.round(layout.fontSize * LINE_HEIGHT_RATIO);
  ctx.font = `${CAPTION_FONT_WEIGHT} ${layout.fontSize}px ${CAPTION_FONT_FAMILY}, Arial, sans-serif`;
  ctx.textBaseline = 'middle';

  const firstY = Math.round(VIDEO_HEIGHT / 2 - layout.totalHeight / 2 + lineHeight / 2);
  const spaceWidth = ctx.measureText(' ').width;

  layout.lines.forEach((line, lineIndex) => {
    const widths = line.words.map(word => ctx.measureText(word.text).width);
    const totalWidth =
      widths.reduce((sum, width) => sum + width, 0) + spaceWidth * (line.words.length - 1);
    let x = VIDEO_WIDTH / 2 - totalWidth / 2;
    const y = firstY + lineIndex * lineHeight;

    line.words.forEach((word, wordIndex) => {
      ctx.globalAlpha = activeWordIndex >= 0 && word.index < activeWordIndex ? 0.62 : 1;
      ctx.fillStyle = word.index === activeWordIndex ? HIGHLIGHT_COLOR : TEXT_COLOR;
      ctx.fillText(word.text, x, y);
      x += widths[wordIndex] + spaceWidth;
    });
  });

  ctx.globalAlpha = 1;
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) {
        reject(new Error('Could not render reel frame'));
        return;
      }

      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png');
  });
}

function createCanvasContext(): CanvasRenderingContext2D {
  if (typeof document === 'undefined') {
    throw new Error('Browser canvas is required for reel export');
  }

  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas is required for reel export');
  }

  return ctx;
}

function createCanvasFrameRenderer(): (spec: ReelFrameSpec) => Promise<Uint8Array> {
  // The background (fill, grid, watermark) is identical on every frame, so
  // render it once and stamp it onto a single reused frame canvas per spec.
  const background = createCanvasContext();
  background.fillStyle = BACKGROUND_COLOR;
  background.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  drawGrid(background);
  background.fillStyle = 'rgba(24,24,27,0.18)';
  background.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  background.font = WATERMARK_FONT;
  background.fillStyle = 'rgba(255,255,255,0.78)';
  background.fillText('September', 90, 1770);

  const frame = createCanvasContext();

  // A caption's layout (font size + wrapped lines) is identical across all of
  // its word-frames, so compute the binary-search fit once per caption.
  const layoutCache = new Map<ReelCaption, CaptionLayout>();
  const getLayout = (caption: ReelCaption): CaptionLayout => {
    let layout = layoutCache.get(caption);
    if (!layout) {
      layout = layoutCaption(caption, VIDEO_WIDTH, VIDEO_HEIGHT);
      layoutCache.set(caption, layout);
    }
    return layout;
  };

  return async spec => {
    frame.drawImage(background.canvas, 0, 0);
    if (spec.caption) {
      drawCaption(frame, getLayout(spec.caption), spec.activeWordIndex ?? -1);
    }
    return canvasToPngBytes(frame.canvas);
  };
}

let ffmpegPromise: Promise<ReelFfmpeg> | null = null;

async function loadBrowserFfmpeg(): Promise<ReelFfmpeg> {
  try {
    ffmpegPromise ??= (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ]);
      const ffmpeg = new FFmpeg();

      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      return ffmpeg;
    })();

    return await ffmpegPromise;
  } catch (error) {
    ffmpegPromise = null;
    throw error;
  }
}

function concatFileList(frameNames: string[], durations: number[]): string {
  const lines: string[] = [];

  frameNames.forEach((frameName, index) => {
    lines.push(`file '${frameName}'`);
    lines.push(`duration ${durations[index].toFixed(3)}`);
  });

  if (frameNames.length) {
    lines.push(`file '${frameNames[frameNames.length - 1]}'`);
  }

  return `${lines.join('\n')}\n`;
}

async function deleteFiles(ffmpeg: ReelFfmpeg, paths: string[]): Promise<void> {
  if (!ffmpeg.deleteFile) return;
  await Promise.all(paths.map(path => ffmpeg.deleteFile?.(path).catch(() => undefined)));
}

export async function renderNoteReelVideoWithWasm(
  input: RenderNoteReelVideoInput,
  options: RenderNoteReelVideoOptions = {}
): Promise<RenderNoteReelVideoResult> {
  if (!input.captions.length) {
    throw new Error('Caption timing is required');
  }

  if (input.durationSeconds <= 0 || input.durationSeconds > 180) {
    throw new Error('Reel duration must be between 0 and 180 seconds');
  }

  const audioBytes = dataUriToUint8Array(input.audioDataUri);
  if (audioBytes.byteLength === 0) {
    throw new Error('Audio data is required');
  }

  const ffmpeg = await (options.loadFfmpeg ?? loadBrowserFfmpeg)();
  const renderFrame = options.renderFrame ?? createCanvasFrameRenderer();
  const specs = frameSpecs(input.captions, input.durationSeconds);
  const audioPath = 'audio.mp3';
  const framesPath = 'frames.txt';
  const outputPath = 'reel.mp4';
  const frameNames: string[] = [];

  try {
    await ffmpeg.writeFile(audioPath, audioBytes);

    for (let i = 0; i < specs.length; i++) {
      const frameName = `frame-${i.toString().padStart(4, '0')}.png`;
      frameNames.push(frameName);
      await ffmpeg.writeFile(frameName, await renderFrame(specs[i]));
    }

    await ffmpeg.writeFile(
      framesPath,
      new TextEncoder().encode(
        concatFileList(
          frameNames,
          specs.map(spec => spec.durationSeconds)
        )
      )
    );

    const exitCode = await ffmpeg.exec(
      buildWasmFfmpegArgs({
        audioPath,
        framesPath,
        outputPath,
        durationSeconds: input.durationSeconds,
      })
    );
    if (typeof exitCode === 'number' && exitCode !== 0) {
      throw new Error(`ffmpeg.wasm exited with code ${exitCode}`);
    }

    const output = await ffmpeg.readFile(outputPath);
    const outputBytes = typeof output === 'string' ? new TextEncoder().encode(output) : output;

    return {
      blob: new Blob([outputBytes], { type: 'video/mp4' }),
      contentType: 'video/mp4',
    };
  } finally {
    await deleteFiles(ffmpeg, [audioPath, framesPath, outputPath, ...frameNames]);
  }
}
