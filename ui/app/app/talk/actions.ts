'use server';

import { ElevenLabsClient } from 'elevenlabs';
import { z } from 'zod';

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

const GetVoicesSchema = z.object({
  search: z.string().optional(),
});

export type GetVoicesRequest = z.infer<typeof GetVoicesSchema>;

export async function getVoices(request: GetVoicesRequest) {
  const { search } = GetVoicesSchema.parse(request);

  const allVoices = await client.voices.getAll();
  const clonedVoices = allVoices.voices.filter(voice => {
    return voice.category === 'cloned';
  });
  const defaultVoices = allVoices.voices.filter(voice => {
    return voice.category === 'premade';
  });

  const filteredClonedVoices = clonedVoices.concat(defaultVoices).filter(voice => {
    if (search && !voice.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return {
    voices: filteredClonedVoices,
    total: filteredClonedVoices.length,
  };
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
