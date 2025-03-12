'use server';

import { z } from 'zod';

import { ElevenAPI } from '@/lib/api.elevenlabs';

const GetVoicesSchema = z.object({
  search: z.string().optional(),
});

export type GetVoicesRequest = z.infer<typeof GetVoicesSchema>;

export async function getVoices(request: GetVoicesRequest) {
  const { search } = GetVoicesSchema.parse(request);

  const allVoices = await ElevenAPI.voices.getAll();
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
  const voice = await ElevenAPI.voices.addSharingVoice(owner_id, voice_id, {
    new_name: name,
  });

  return voice.voice_id;
}
