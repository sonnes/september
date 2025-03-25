'use server';

import { revalidatePath } from 'next/cache';

import { ElevenLabs } from 'elevenlabs';
import { z } from 'zod';

import { ElevenAPI } from '@/lib/api.elevenlabs';
import { createClient } from '@/supabase/server';
import { Voice } from '@/types/speech';

import { getAuthUser } from './user';

const GetVoicesSchema = z.object({
  query: z.string().optional(),
  search: z.string().optional(),
});

const ranks = {
  cloned: 1,
  professional: 2,
  premade: 3,
  similar: 4,
};

export type GetVoicesRequest = z.infer<typeof GetVoicesSchema>;
export type GetVoicesResponse = {
  voices: Voice[];
};

export async function getVoices(request: GetVoicesRequest): Promise<GetVoicesResponse> {
  const { query, search } = GetVoicesSchema.parse(request);

  if (search && search === 'similar') {
    const similarVoices = await findSimilarVoices();
    return {
      voices: similarVoices,
    };
  }

  const { voices: allVoices } = await ElevenAPI.voices.getAll();

  const filteredClonedVoices = allVoices
    .sort((a, b) => {
      const rankA = ranks[a.category as keyof typeof ranks];
      const rankB = ranks[b.category as keyof typeof ranks];
      return rankA - rankB;
    })
    .filter(voice => {
      if (query && !voice.name?.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });

  return {
    voices: mapAPIVoices(filteredClonedVoices),
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

async function findSimilarVoices() {
  const [audioFiles, recordings] = await Promise.all([getUploadedFiles(), getRecordings()]);

  const files =
    audioFiles.length > 0
      ? await downloadAll(audioFiles)
      : await downloadAll(Object.values(recordings));

  const mergedFiles = mergeAudioFiles(files);

  const response = await ElevenAPI.voices.getSimilarLibraryVoices({
    audio_file: mergedFiles,
    similarity_threshold: 2,
  });

  return mapLibraryVoices(response.voices);
}

export async function getUploadedFiles() {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) {
    throw new Error('User not found');
  }

  const prefix = `${user.id}/uploads`;
  const { data, error } = await supabase.storage.from('voice_samples').list(prefix);

  if (error) throw error;

  return data.map(file => `${prefix}/${file.name}`);
}

export async function getRecordings() {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) throw new Error('User not found');

  const prefix = `${user.id}/recordings`;
  const { data, error } = await supabase.storage.from('voice_samples').list(prefix);

  if (error) throw error;

  return data.reduce<Record<string, string>>((acc, file) => {
    const name = file.name.replace(prefix, '');
    const id = name.split('.')[0];
    acc[id] = `${prefix}/${file.name}`;
    return acc;
  }, {});
}

export async function downloadAll(paths: string[]) {
  const supabase = await createClient();
  const user = await getAuthUser();

  if (!user) throw new Error('User not found');

  const files = await Promise.all(
    paths.map(async path => {
      const { data, error } = await supabase.storage.from('voice_samples').download(path);
      if (error) throw error;
      return data;
    })
  );

  return files;
}

function mergeAudioFiles(files: Blob[]) {
  // Concatenate the audio files in sequence
  const mergedBlob = new Blob(files, { type: files[0].type });
  return mergedBlob;
}

function mapLibraryVoices(voices: ElevenLabs.LibraryVoiceResponse[]): Voice[] {
  return voices.map(voice => ({
    voice_id: voice.voice_id,
    name: voice.name,
    category: voice.category,
    accent: voice.accent,
    gender: voice.gender?.replaceAll('_', ' ').replaceAll('-', ' '),
    age: voice.age?.replaceAll('_', ' ').replaceAll('-', ' '),
    use_case: voice.use_case?.replaceAll('_', ' ').replaceAll('-', ' '),
    language: voice.language,
    description: voice.description,
    preview_url: voice.preview_url,
    public_owner_id: voice.public_owner_id,
    is_added_by_user: voice.is_added_by_user,
  }));
}

function mapAPIVoices(voices: ElevenLabs.Voice[]): Voice[] {
  return voices.map(voice => {
    const labels = voice.labels || {};

    return {
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      accent: labels.accent,
      gender: labels.gender?.replaceAll('_', ' ').replaceAll('-', ' '),
      age: labels.age?.replaceAll('_', ' ').replaceAll('-', ' '),
      use_case: labels.use_case?.replaceAll('_', ' ').replaceAll('-', ' '),
      language: labels.language,
      description: voice.description,
      preview_url: voice.preview_url,
      public_owner_id: voice.sharing?.public_owner_id,
    };
  });
}

export async function deleteVoice(voiceId: string) {
  await ElevenAPI.voices.delete(voiceId);
  revalidatePath('/app/voices');
}
