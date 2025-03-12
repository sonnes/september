'use server';

import { ElevenLabsClient } from 'elevenlabs';
import { z } from 'zod';

import { getAccount, setVoiceId } from '@/app/actions/account';
import { downloadAll, getRecordings, getUploadedFiles } from '@/app/actions/voices';

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
