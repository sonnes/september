import { createServerFn } from '@tanstack/react-start';
import { setResponseHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';

import { renderNoteReelVideo } from './reel-renderer.server';

const ReelWordSchema = z.object({
  text: z.string().min(1),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
});

const ReelCaptionSchema = z.object({
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  words: z.array(ReelWordSchema).min(1),
});

const RenderNoteReelVideoSchema = z.object({
  audioDataUri: z.string().min(1).max(40_000_000),
  captions: z.array(ReelCaptionSchema).min(1).max(500),
  durationSeconds: z.number().min(0.1).max(180),
});

export const renderNoteReelVideoFn = createServerFn({ method: 'POST' })
  .validator(RenderNoteReelVideoSchema)
  .handler(async ({ data }) => {
    setResponseHeaders({ 'Cache-Control': 'no-store' });
    return renderNoteReelVideo(data);
  });
