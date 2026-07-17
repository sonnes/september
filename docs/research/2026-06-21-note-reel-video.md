# Note reel video generation research

## Assumption

"elevlabs ts audio" means ElevenLabs TTS audio from the existing speech provider.

## Goal

Generate a vertical, Reels/TikTok-style MP4 from note text:

1. Note markdown becomes spoken text.
2. ElevenLabs generates MP3 audio plus character timing.
3. Text animates/highlights in sync with audio.
4. User downloads a 9:16 MP4.

## Existing pieces

- `apps/web/src/packages/speech/lib/providers/elevenlabs.ts` already calls
  `POST /v1/text-to-speech/:voice_id/with-timestamps` and returns `blob` plus
  `alignment`.
- `apps/web/src/packages/audio/types/index.ts` already models alignment as
  `{ characters, start_times, end_times }`.
- `apps/web/src/packages/audio/hooks/use-text-viewer.ts` already turns character
  alignment into word timing and current/spoken/unspoken status.
- `apps/web/src/packages/audio/components/reel.tsx` already has `ReelTextViewer`,
  a full-screen reel-style text renderer that syncs to `alignment + currentTime`.
- `apps/web/src/packages/notes/hooks/use-slide-voice-over.ts` already caches
  generated slide/note audio and alignment in IndexedDB.
- `apps/web/src/packages/notes/components/space-notes.tsx` already offers
  voice-over and MP3 download for selected space notes.

Missing piece: deterministic video export. Current code can play a reel-like
preview, but it cannot render frames and mux MP3 into MP4.

## Implemented MVP

The implementation uses `ffmpeg.wasm`, not Remotion. It keeps the browser-side
ElevenLabs generation and timing pipeline from this research, renders 1080x1920
caption frames with Canvas, then writes those PNG frames plus the audio into
`ffmpeg.wasm`'s virtual filesystem to produce a downloadable MP4.

This deliberately chooses the smaller path for the first product slice:

- no Remotion dependency
- no Remotion license decision before validation
- no note/audio upload to the app server
- real MP4 download from the app
- simpler tests around caption timing and FFmpeg arguments

The tradeoff: visual styling is simpler than a React-rendered Remotion
composition, and browser-side encoding is slower than native FFmpeg. Remotion or
server-native FFmpeg is still the better follow-up if September needs template
variants, richer animation, background media, faster exports, or closer parity
with `ReelTextViewer`.

## External findings

- ElevenLabs has a non-streaming timestamp endpoint:
  `POST https://api.elevenlabs.io/v1/text-to-speech/:voice_id/with-timestamps`.
  It returns `audio_base64`, `alignment`, and `normalized_alignment` with
  character start/end times. Source:
  https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- ElevenLabs also has a streaming timestamp endpoint if we later want progressive
  preview; it streams base64 audio chunks plus timing data. Source:
  https://elevenlabs.io/docs/api-reference/text-to-speech/stream-with-timestamps
- Remotion is the best fit for server-side MP4 export because it renders React
  compositions with audio to H.264 MP4 via `@remotion/renderer` / `renderMedia`.
  Source: https://www.remotion.dev/docs/renderer
- Remotion supports parameterized renders: pass `inputProps` to a composition and
  use `renderMedia` for each payload. Source:
  https://www.remotion.dev/docs/dataset-render
- Remotion has `@remotion/captions` helpers including
  `createTikTokStyleCaptions`, but September can also group words itself from
  existing ElevenLabs timings. Source: https://www.remotion.dev/docs/api
- Remotion server rendering can run through Node/Bun APIs, Lambda, Vercel
  Sandbox, GitHub Actions, Docker, or cloud containers. Source:
  https://www.remotion.dev/docs/ssr
- Remotion browser rendering exists, but is experimental alpha, requires
  WebCodecs, and supports only a subset of HTML. Not ideal for first MP4 export.
  Source: https://www.remotion.dev/docs/client-side-rendering
- Remotion may require a company license depending on org size / commercial use.
  Source: https://www.remotion.dev/docs/license

## Recommended architecture

### 1. Build a note reel asset in the browser

Keep TTS client-side, matching current September local-first behavior.

Input:

```ts
type NoteReelInput = {
  noteId: string;
  noteName?: string;
  markdown: string;
};
```

Output:

```ts
type NoteReelAsset = {
  title: string;
  text: string;
  audioDataUri: string; // data:audio/mp3;base64,...
  alignment: Alignment;
  durationSeconds: number;
};
```

Flow:

1. Convert markdown to voice text with one shared helper. Today similar logic
   lives privately in `SpaceNotes`; move it into `@/packages/shared` or
   `@/packages/notes` when implementing.
2. Require `speechConfig.provider === 'elevenlabs'` for export quality because
   synced captions need alignment. Other providers can preview/download audio,
   but MP4 export should show "ElevenLabs required" until they provide timings.
3. Call existing `generateSpeech(text)`.
4. Measure `durationSeconds` from the MP3 via `HTMLAudioElement.loadedmetadata`.
5. Store/reuse cached audio and alignment using existing audio storage.

Privacy: browser sends note text only to ElevenLabs, same as current voice-over.
Renderer never needs ElevenLabs API key.

### 2. Convert alignment into caption windows

Extract pure helpers from `use-text-viewer.ts`:

```ts
alignmentToWords(alignment): TextWord[]
wordsToReelCaptions(words, options): ReelCaption[]
```

Caption grouping rules for MVP:

- max 5-7 words per caption window
- split at punctuation
- split on pauses over ~0.35s
- keep each window under ~2.4s when possible
- always preserve word `startTime` / `endTime`

This gives real "Reels" behavior: small caption chunks centered on a 9:16 frame,
with current word highlighted.

### 3. Add a Remotion composition

Composition props:

```ts
type NoteReelCompositionProps = {
  title?: string;
  text: string;
  captions: ReelCaption[];
  audioSrc: string;
  durationSeconds: number;
};
```

Video defaults:

- width `1080`
- height `1920`
- fps `30`
- duration `Math.ceil(durationSeconds * fps)`
- font: Noto Sans
- colors/tokens: reuse `DESIGN.md`; no new visual system

Render logic:

- `<Audio src={audioSrc} />`
- current frame -> seconds = `frame / fps`
- active caption = caption where `start <= seconds < end`
- current word = word where `start <= seconds < end`
- animate caption opacity/position lightly
- render title/footer only if useful; keep main text readable

Reuse September's existing `ReelRenderer` behavior if feasible. If Remotion
cannot reuse app Tailwind/runtime cleanly, copy the minimal pure rendering logic
into the video composition and keep it data-driven.

### 4. Export MP4 through a render endpoint or local render command

Preferred first implementation:

- Browser creates `NoteReelAsset`.
- Browser `POST`s `{ title, text, audioDataUri, alignment, durationSeconds }` to
  a render endpoint.
- Endpoint writes audio to a temp file, runs Remotion `renderMedia`, returns MP4.
- Browser downloads MP4.

Important: if deployed without a render-capable backend, use a separate local
render command first:

```sh
pnpm reel:render -- ./tmp/reel-input.json ./tmp/reel.mp4
```

This is simpler and avoids forcing Vercel/serverless decisions too early. Later,
move same renderer behind Lambda/Vercel Sandbox/worker.

## TDD plan for implementation

1. `markdownToVoiceText` shared helper
   - verify links, markdown punctuation, headings, whitespace
2. `alignmentToWords`
   - verify word start/end from character arrays
   - verify whitespace and hidden `[audio tags]`
3. `wordsToReelCaptions`
   - verify punctuation splits
   - verify pause splits
   - verify max words per caption
4. `createNoteReelAsset`
   - mock `generateSpeech`
   - verify ElevenLabs alignment required
   - verify data URI + duration returned
5. Remotion composition pure timing tests
   - given frame/time, correct caption and word active
6. Export command/endpoint smoke test
   - render short fixture to MP4
   - verify file exists and ffprobe duration roughly matches audio

Run before commit from `apps/web/`:

```sh
pnpm test
pnpm lint
pnpm build
```

## Tradeoffs

### Remotion renderer

Best output quality and easiest React reuse. Produces true MP4. Needs Node/Chrome
/ffmpeg runtime and possible commercial license.

### Browser-only render

Best privacy and no server. Bad first choice because browser video rendering is
still experimental, WebCodecs support varies, and DOM-to-video with audio muxing
is more fragile than this feature deserves.

### FFmpeg-only render

Simple if captions are basic SRT/text overlays. Poor fit for polished, animated,
React-styled captions. Harder to match app preview.

Chosen for the MVP through `ffmpeg.wasm` because it gives a real downloadable
MP4 without adding a video-rendering framework or sending audio to the app
server. The implementation rasterizes caption frames in Canvas first, so it does
not depend on FFmpeg builds that include `drawtext`, `subtitles`, or `ass`
filters.

## MVP scope

Do:

- Notes panel action: "Export reel"
- ElevenLabs-only export guard
- vertical preview using existing `ReelTextViewer`
- MP4 export for one selected note
- no background images, no music, no templates

Do not do yet:

- editor timeline
- multiple visual templates
- remote render queue
- upload/share destinations
- non-ElevenLabs forced alignment
- AI-written script rewriting

## Open questions

- Where should rendering run first: local command, TanStack Start server route, or
  external worker?
- Is remote rendering acceptable for private notes if audio/text payload leaves
  browser, even without API keys?
- Should long notes export as one long reel, or split into multiple 30-60s clips?
- Does September need a Remotion company license before shipping this in product?
