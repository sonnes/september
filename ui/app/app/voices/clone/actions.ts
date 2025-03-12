'use server';

import { ElevenLabsClient } from 'elevenlabs';
import { z } from 'zod';

import { getAuthUser } from '@/app/actions/user';
import { getAccount, setVoiceId } from '@/app/app/account/actions';
import { createClient } from '@/supabase/server';

const CloneVoiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type CloneVoiceType = z.infer<typeof CloneVoiceSchema>;

export type CloneVoiceResponse = {
  success: boolean;
  message: string;
  inputs?: CloneVoiceType;
  errors?: Record<string, string[]>;
};

export async function cloneVoice(
  _: CloneVoiceResponse,
  formData: FormData
): Promise<CloneVoiceResponse> {
  const account = await getAccount();

  if (!account) {
    throw new Error('Account not found');
  }

  if (!account.approved) {
    return {
      success: false,
      message: 'You are on the waitlist',
    };
  }

  const inputs = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
  };

  const { success, data, error } = CloneVoiceSchema.safeParse(inputs);

  if (!success) {
    return {
      success: false,
      message: error?.message || 'Invalid form data',
      inputs,
      errors: error?.flatten().fieldErrors,
    };
  }

  const newVoice = await createVoice(data);

  await setVoiceId(newVoice.voice_id);

  return {
    success: true,
    message: 'Voice created successfully',
  };
}

async function createVoice(data: CloneVoiceType) {
  const [audioFiles, recordings] = await Promise.all([getUploadedFiles(), getRecordings()]);

  const files =
    audioFiles.length > 0
      ? await downloadAll(audioFiles)
      : await downloadAll(Object.values(recordings));

  const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

  const voice = await client.voices.add({
    files,
    name: data.name,
    description: data.description,
    labels: JSON.stringify({ app: 'september' }),
  });

  return voice;
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

async function downloadAll(paths: string[]) {
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
