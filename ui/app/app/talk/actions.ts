'use server';

import { ElevenLabsClient } from 'elevenlabs';
import { z } from 'zod';

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

const GetVoicesSchema = z.object({
  gender: z.enum(['male', 'female']).optional(),
  language: z.string().optional(),
  search: z.string().optional(),
});

export type GetVoicesRequest = z.infer<typeof GetVoicesSchema>;

export async function getVoices(request: GetVoicesRequest) {
  const { gender, language, search } = GetVoicesSchema.parse(request);

  const voices = await client.voices.getShared({
    page_size: 50,
    use_cases: 'conversational',
    sort: 'trending',
    language,
    gender,
    search,
  });

  return voices;
}

export async function addVoice({
  owner_id,
  voice_id,
  name,
}: {
  owner_id: string;
  voice_id: string;
  name: string;
}) {
  const voice = await client.voices.addSharingVoice(owner_id, voice_id, {
    new_name: name,
  });

  return voice.voice_id;
}
