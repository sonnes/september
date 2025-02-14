'use server';

import { ElevenLabsClient } from 'elevenlabs';
import { z } from 'zod';

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

const GetVoicesSchema = z.object({
  gender: z.enum(['male', 'female']).optional(),
  language: z.string().optional(),
});

export type GetVoicesRequest = z.infer<typeof GetVoicesSchema>;

export async function getVoices(request: GetVoicesRequest) {
  const { gender, language } = GetVoicesSchema.parse(request);

  const voices = await client.voices.getShared({
    page_size: 100,
    use_cases: 'conversational',
    category: 'professional',
    sort: 'trending',
    language,
    gender,
  });

  return voices;
}
