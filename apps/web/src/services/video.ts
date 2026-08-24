/**
 * The 9:16 story film of a note.
 *
 * The browser draws every frame on a canvas and `ffmpeg.wasm` joins them to
 * the voice. Nothing leaves the machine: the words, the sound, and the film
 * are made on the same tab that plays them.
 *
 * This is the renderer of the retired reel feature, kept for its timing and
 * re-dressed in the presentation tones. The caption rules live in
 * `@/rules/present`, so the exported film and the stage agree.
 */

import {
  alignmentToWords,
  captionRoles,
  chunkFontRatio,
  presentTone,
  roleSpec,
  SPOKEN_OPACITY,
  STAGE_PADDING_RATIO,
  UNSPOKEN_OPACITY,
  wordsToCaptions,
  type Caption,
  type ChunkRole,
  type PresentTone,
  type PresentToneKey,
  type SpeechAlignment,
} from '@/rules/present';

const WIDTH = 1080;
const HEIGHT = 1920;
const ASPECT = HEIGHT / WIDTH;
/** The longest film one note may become. */
const MAX_SECONDS = 600;

const CORE_VERSION = '0.12.10';
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

/** What the export dialog shows while it waits. */
export type VideoStage = 'voice' | 'frames' | 'video';

export interface RenderVideoInput {
  audio: Blob;
  alignment: SpeechAlignment;
  tone: PresentToneKey;
  onStage?: (stage: VideoStage) => void;
}

interface Frame {
  caption?: Caption;
  role?: ChunkRole;
  activeWordIndex: number;
  durationSeconds: number;
}

interface LaidOutLine {
  words: { text: string; index: number }[];
}

interface CaptionLayout {
  fontSize: number;
  lines: LaidOutLine[];
}

// ------------------------------------------------------------------ drawing

function context(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the film.');
  return ctx;
}

/**
 * The largest size the words fit at, then the lines they wrap into.
 *
 * The size comes from the same rule the stage uses, so a chunk that fills the
 * screen fills the frame. The wrap is measured here, because only the canvas
 * knows how wide a word really is.
 */
function layoutCaption(
  ctx: CanvasRenderingContext2D,
  caption: Caption,
  role: ChunkRole,
  tone: PresentTone
): CaptionLayout {
  const spec = roleSpec(role, tone.family);
  const text = caption.words.map(word => word.text).join(' ');
  const fontSize = Math.round(chunkFontRatio(text, role, ASPECT) * WIDTH);
  ctx.font = `${spec.fontWeight} ${fontSize}px ${spec.fontFamily}`;

  const room = WIDTH * (1 - STAGE_PADDING_RATIO * 2);
  const lines: LaidOutLine[] = [];
  let current: LaidOutLine = { words: [] };

  caption.words.forEach((word, index) => {
    const next = [...current.words, { text: word.text, index }];
    const width = ctx.measureText(next.map(one => one.text).join(' ')).width;
    if (current.words.length && width > room) {
      lines.push(current);
      current = { words: [{ text: word.text, index }] };
    } else {
      current = { words: next };
    }
  });

  if (current.words.length) lines.push(current);
  return { fontSize, lines };
}

function drawMark(ctx: CanvasRenderingContext2D, tone: PresentTone, mark: HTMLImageElement | null) {
  const inset = Math.round(WIDTH * 0.06);

  if (tone.mark === 'keycap' && mark) {
    const size = Math.round(WIDTH * 0.07);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(mark, inset, HEIGHT - inset - size, size, size);
    ctx.globalAlpha = 1;
    return;
  }

  const size = Math.round(WIDTH * 0.032);
  ctx.font = `700 ${size}px Lexend, "Noto Sans", sans-serif`;
  ctx.fillStyle = tone.display;
  ctx.globalAlpha = 0.65;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('September', inset, HEIGHT - inset);
  ctx.globalAlpha = 1;
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  layout: CaptionLayout,
  role: ChunkRole,
  tone: PresentTone,
  activeWordIndex: number
) {
  const spec = roleSpec(role, tone.family);
  const lineHeight = Math.round(layout.fontSize * spec.lineHeightRatio);
  const base = role === 'display' ? tone.display : tone.support;

  ctx.font = `${spec.fontWeight} ${layout.fontSize}px ${spec.fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const space = ctx.measureText(' ').width;
  const top = Math.round(HEIGHT / 2 - ((layout.lines.length - 1) * lineHeight) / 2);

  layout.lines.forEach((line, row) => {
    const widths = line.words.map(word => ctx.measureText(word.text).width);
    const total = widths.reduce((sum, width) => sum + width, 0) + space * (line.words.length - 1);
    let x = WIDTH / 2 - total / 2;
    const y = top + row * lineHeight;

    line.words.forEach((word, at) => {
      const active = word.index === activeWordIndex;
      ctx.globalAlpha = active
        ? 1
        : word.index < activeWordIndex
          ? SPOKEN_OPACITY
          : UNSPOKEN_OPACITY;
      ctx.fillStyle = active ? tone.accent : base;
      ctx.fillText(word.text, x, y);

      if (active) {
        // The spoken word takes the accent and a rule under it, the same two
        // marks the stage uses, so one look carries across both surfaces.
        const thickness = Math.max(2, Math.round(layout.fontSize * 0.05));
        ctx.fillRect(
          x,
          y + Math.round(layout.fontSize * 0.62),
          widths[at]!,
          thickness
        );
      }

      x += widths[at]! + space;
    });
  });

  ctx.globalAlpha = 1;
}

/** One frame for each word, held for as long as the word is said. */
function framesOf(captions: Caption[], roles: ChunkRole[], durationSeconds: number): Frame[] {
  const frames: Frame[] = [];
  let cursor = 0;

  captions.forEach((caption, at) => {
    if (caption.startTime > cursor) {
      frames.push({ activeWordIndex: -1, durationSeconds: caption.startTime - cursor });
    }

    const role = roles[at] ?? 'display';
    caption.words.forEach((word, index) => {
      const next = caption.words[index + 1];
      frames.push({
        caption,
        role,
        activeWordIndex: index,
        durationSeconds: Math.max(0.05, (next?.startTime ?? caption.endTime) - word.startTime),
      });
    });

    cursor = caption.endTime;
  });

  if (durationSeconds > cursor) {
    frames.push({ activeWordIndex: -1, durationSeconds: durationSeconds - cursor });
  }

  return frames.length ? frames : [{ activeWordIndex: -1, durationSeconds }];
}

async function loadMark(): Promise<HTMLImageElement | null> {
  try {
    const mark = new Image();
    mark.src = '/logo.svg';
    await mark.decode();
    return mark;
  } catch {
    // The film is still the film without the corner mark.
    return null;
  }
}

/** Canvas silently falls back to a default face for a font it never fetched. */
async function loadFaces(tone: PresentTone): Promise<void> {
  if (!document.fonts) return;
  try {
    if (tone.family === 'reading') await import('@fontsource-variable/fraunces');
    await Promise.all([
      document.fonts.load('700 32px "Noto Sans"'),
      document.fonts.load('500 32px "Noto Sans"'),
      document.fonts.load('700 32px Lexend'),
      ...(tone.family === 'reading'
        ? [document.fonts.load('550 32px "Fraunces Variable"')]
        : []),
    ]);
    await document.fonts.ready;
  } catch {
    // Best effort; a missing face costs the look, not the export.
  }
}

function toPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) {
        reject(new Error('This browser could not draw a frame.'));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png');
  });
}

// ------------------------------------------------------------------- ffmpeg

interface Ffmpeg {
  writeFile(path: string, data: Uint8Array | string): Promise<unknown>;
  exec(args: string[]): Promise<number | unknown>;
  readFile(path: string): Promise<Uint8Array | string>;
  deleteFile?(path: string): Promise<unknown>;
}

let ffmpegPromise: Promise<Ffmpeg> | null = null;

async function loadFfmpeg(): Promise<Ffmpeg> {
  try {
    ffmpegPromise ??= (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ffmpeg;
    })();

    return await ffmpegPromise;
  } catch (reason) {
    ffmpegPromise = null;
    throw reason;
  }
}

export function videoArgs(durationSeconds: number): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    'frames.txt',
    '-i',
    'audio.mp3',
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
    'note.mp4',
  ];
}

function concatList(names: string[], durations: number[]): string {
  const lines: string[] = [];

  names.forEach((name, at) => {
    lines.push(`file '${name}'`);
    lines.push(`duration ${durations[at]!.toFixed(3)}`);
  });
  // The concat demuxer drops the last frame without this repeat.
  if (names.length) lines.push(`file '${names[names.length - 1]}'`);

  return `${lines.join('\n')}\n`;
}

// -------------------------------------------------------------------- render

export async function renderNoteVideo({
  audio,
  alignment,
  tone: toneKey,
  onStage,
}: RenderVideoInput): Promise<Blob> {
  const tone = presentTone(toneKey);
  const captions = wordsToCaptions(alignmentToWords(alignment));
  if (!captions.length) throw new Error('That voice returned no word timing.');

  const durationSeconds = captions[captions.length - 1]!.endTime;
  if (durationSeconds <= 0 || durationSeconds > MAX_SECONDS) {
    throw new Error('This note is too long to film.');
  }

  onStage?.('frames');
  await loadFaces(tone);
  const mark = await loadMark();
  const roles = captionRoles(captions);
  const frames = framesOf(captions, roles, durationSeconds);

  const background = context();
  background.fillStyle = tone.background;
  background.fillRect(0, 0, WIDTH, HEIGHT);
  drawMark(background, tone, mark);

  const frame = context();
  const layouts = new Map<Caption, CaptionLayout>();
  const drawn: Uint8Array[] = [];

  for (const one of frames) {
    frame.drawImage(background.canvas, 0, 0);
    if (one.caption && one.role) {
      let layout = layouts.get(one.caption);
      if (!layout) {
        layout = layoutCaption(frame, one.caption, one.role, tone);
        layouts.set(one.caption, layout);
      }
      drawCaption(frame, layout, one.role, tone, one.activeWordIndex);
    }
    drawn.push(await toPng(frame.canvas));
  }

  onStage?.('video');
  const ffmpeg = await loadFfmpeg();
  const names = drawn.map((_, at) => `frame-${at.toString().padStart(4, '0')}.png`);

  try {
    await ffmpeg.writeFile('audio.mp3', new Uint8Array(await audio.arrayBuffer()));
    for (let at = 0; at < drawn.length; at++) {
      await ffmpeg.writeFile(names[at]!, drawn[at]!);
    }
    await ffmpeg.writeFile(
      'frames.txt',
      new TextEncoder().encode(
        concatList(
          names,
          frames.map(one => one.durationSeconds)
        )
      )
    );

    const code = await ffmpeg.exec(videoArgs(durationSeconds));
    if (typeof code === 'number' && code !== 0) {
      throw new Error('The film could not be joined to the voice.');
    }

    const output = await ffmpeg.readFile('note.mp4');
    const bytes = typeof output === 'string' ? new TextEncoder().encode(output) : output;
    return new Blob([bytes as BlobPart], { type: 'video/mp4' });
  } finally {
    if (ffmpeg.deleteFile) {
      await Promise.all(
        ['audio.mp3', 'frames.txt', 'note.mp4', ...names].map(path =>
          ffmpeg.deleteFile?.(path).catch(() => undefined)
        )
      );
    }
  }
}
