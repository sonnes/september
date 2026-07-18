import { computePretextLayout, defaultPretextPadding } from '@/packages/audio/hooks/use-pretext-layout';

import type { ReelCaption } from './reel';
import {
  type CaptionRole,
  captionRoles,
  DEFAULT_PAIR_KEY,
  ensureReelFonts,
  GRAIN_OPACITY,
  type ReelPair,
  type ReelPairKey,
  reelPair,
  roleColors,
  type RoleSpec,
  ROLE_SPECS,
  SPOKEN_OPACITY,
  UNSPOKEN_OPACITY,
  VIGNETTE_CENTER_X_RATIO,
  VIGNETTE_CENTER_Y_RATIO,
  VIGNETTE_INNER_STOP,
  VIGNETTE_OUTER_ALPHA,
  VIGNETTE_RX_RATIO,
  VIGNETTE_RY_RATIO,
  WATERMARK_BOTTOM_RATIO,
  WATERMARK_FONT_RATIO,
  WATERMARK_LEFT_RATIO,
  WATERMARK_TEXT,
} from './reel-theme';

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const FFMPEG_CORE_VERSION = '0.12.10';
const FFMPEG_CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

export interface RenderNoteReelVideoInput {
  audioDataUri: string;
  captions: ReelCaption[];
  durationSeconds: number;
  /** Tailwind colour pair for the frame look. Defaults to `stone`. */
  pairKey?: ReelPairKey;
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
  role?: CaptionRole;
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
 * This is the same fit-and-wrap the live preview uses — same role spec, same
 * padding — so the DOM player and the MP4 frame agree.
 */
export function layoutCaption(
  caption: ReelCaption,
  width: number,
  height: number,
  roleSpec: RoleSpec
): CaptionLayout {
  const text = caption.words.map(word => word.text).join(' ');
  const { fontSize, lines, totalHeight } = computePretextLayout({
    text,
    containerWidth: width,
    containerHeight: Math.round(height * roleSpec.boxHeightRatio),
    fontFamily: roleSpec.fontFamily,
    fontWeight: String(roleSpec.fontWeight),
    lineHeightRatio: roleSpec.lineHeightRatio,
    maxFontSize: Math.round(width * roleSpec.maxFontRatio),
    padding: defaultPretextPadding(width, height),
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

function frameSpecs(
  captions: ReelCaption[],
  roles: CaptionRole[],
  durationSeconds: number
): ReelFrameSpec[] {
  const specs: ReelFrameSpec[] = [];
  let cursor = 0;

  captions.forEach((caption, captionIndex) => {
    if (caption.startTime > cursor) {
      specs.push({ durationSeconds: caption.startTime - cursor });
    }

    const role = roles[captionIndex] ?? 'display';
    caption.words.forEach((word, index) => {
      const next = caption.words[index + 1];
      const endTime = next?.startTime ?? caption.endTime;
      specs.push({
        caption,
        role,
        activeWordIndex: index,
        durationSeconds: Math.max(0.05, endTime - word.startTime),
      });
    });

    cursor = caption.endTime;
  });

  if (durationSeconds > cursor) {
    specs.push({ durationSeconds: durationSeconds - cursor });
  }

  return specs.length ? specs : [{ durationSeconds }];
}

/** Low-opacity monochrome film grain, drawn once onto the shared background. */
function drawGrain(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas;
  const image = ctx.createImageData(width, height);
  const data = image.data;
  const alpha = Math.round(GRAIN_OPACITY * 255);

  for (let i = 0; i < data.length; i += 4) {
    const value = (Math.random() * 256) | 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = alpha;
  }

  // putImageData replaces pixels; blend the grain over the fill via a tile.
  const tile = document.createElement('canvas');
  tile.width = width;
  tile.height = height;
  const tileCtx = tile.getContext('2d');
  if (!tileCtx) return;
  tileCtx.putImageData(image, 0, 0);
  ctx.drawImage(tile, 0, 0);
}

/** Soft radial vignette — transparent centre darkening to the edges. */
function drawVignette(ctx: CanvasRenderingContext2D): void {
  const { width, height } = ctx.canvas;
  const cx = width * VIGNETTE_CENTER_X_RATIO;
  const cy = height * VIGNETTE_CENTER_Y_RATIO;
  const rx = width * VIGNETTE_RX_RATIO;
  const ry = height * VIGNETTE_RY_RATIO;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx / ry, 1);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
  gradient.addColorStop(VIGNETTE_INNER_STOP, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${VIGNETTE_OUTER_ALPHA})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(-width * 4, -height * 4, width * 8, height * 8);
  ctx.restore();
}

function drawWatermark(ctx: CanvasRenderingContext2D, pair: ReelPair): void {
  const { width, height } = ctx.canvas;
  const fontSize = Math.round(width * WATERMARK_FONT_RATIO);
  ctx.font = `600 ${fontSize}px "Noto Sans", Arial, sans-serif`;
  ctx.fillStyle = pair.support;
  ctx.globalAlpha = 0.85;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    WATERMARK_TEXT,
    Math.round(width * WATERMARK_LEFT_RATIO),
    Math.round(height - height * WATERMARK_BOTTOM_RATIO)
  );
  ctx.globalAlpha = 1;
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  layout: CaptionLayout,
  activeWordIndex: number,
  roleSpec: RoleSpec,
  colors: { base: string; active: string }
): void {
  if (!layout.fontSize) return;

  const lineHeight = Math.round(layout.fontSize * roleSpec.lineHeightRatio);
  ctx.font = `${roleSpec.fontWeight} ${layout.fontSize}px ${roleSpec.fontFamily}`;
  ctx.textAlign = 'left';
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
      const isActive = word.index === activeWordIndex;
      ctx.globalAlpha =
        activeWordIndex < 0
          ? 1
          : word.index < activeWordIndex
            ? SPOKEN_OPACITY
            : word.index > activeWordIndex
              ? UNSPOKEN_OPACITY
              : 1;
      ctx.fillStyle = isActive ? colors.active : colors.base;
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

function createCanvasFrameRenderer(pair: ReelPair): (spec: ReelFrameSpec) => Promise<Uint8Array> {
  // The background (solid fill, grain, vignette, watermark) is identical on
  // every frame, so render it once and stamp it onto a reused frame canvas.
  const background = createCanvasContext();
  background.fillStyle = pair.bg;
  background.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  drawGrain(background);
  drawVignette(background);
  drawWatermark(background, pair);

  const frame = createCanvasContext();

  // A caption's layout (font size + wrapped lines) is identical across all of
  // its word-frames, so compute the binary-search fit once per caption.
  const layoutCache = new Map<ReelCaption, CaptionLayout>();
  const getLayout = (caption: ReelCaption, roleSpec: RoleSpec): CaptionLayout => {
    let layout = layoutCache.get(caption);
    if (!layout) {
      layout = layoutCaption(caption, VIDEO_WIDTH, VIDEO_HEIGHT, roleSpec);
      layoutCache.set(caption, layout);
    }
    return layout;
  };

  return async spec => {
    frame.drawImage(background.canvas, 0, 0);
    if (spec.caption && spec.role) {
      const roleSpec = ROLE_SPECS[spec.role];
      const colors = roleColors(pair, spec.role);
      drawCaption(frame, getLayout(spec.caption, roleSpec), spec.activeWordIndex ?? -1, roleSpec, colors);
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

  const pair = reelPair(input.pairKey ?? DEFAULT_PAIR_KEY);
  const roles = captionRoles(input.captions);
  // Canvas measureText/fillText need the serif loaded before the first frame.
  await ensureReelFonts();

  const ffmpeg = await (options.loadFfmpeg ?? loadBrowserFfmpeg)();
  const renderFrame = options.renderFrame ?? createCanvasFrameRenderer(pair);
  const specs = frameSpecs(input.captions, roles, input.durationSeconds);
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
