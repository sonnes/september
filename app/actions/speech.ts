'use server';

import { ElevenLabs, ElevenLabsError } from 'elevenlabs';

import { getAccount } from '@/app/actions/account';
import { ElevenAPI } from '@/lib/api.elevenlabs';
import { createClient } from '@/supabase/server';
import { SpeechSettings } from '@/types/speech';

const defaultVoiceId = 'iP95p4xoKVk53GoZ742B';

interface CreateSpeechParams {
  id: string;
  text: string;
  tone?: string;
  previous_text?: string;
  settings?: SpeechSettings;
}

export const createSpeech = async ({ id, text, previous_text, settings }: CreateSpeechParams) => {
  const account = await getAccount();
  const voiceId = account?.voice_id || defaultVoiceId;

  try {
    const response = await ElevenAPI.textToSpeech.convert(voiceId, {
      output_format: ElevenLabs.OutputFormat.Mp34410032,
      text: text,
      previous_text: previous_text,
      model_id: settings?.model_id || 'eleven_multilingual_v2',
      voice_settings: {
        speed: settings?.speed || 1,
        stability: settings?.stability || 0.7,
        similarity_boost: settings?.similarity || 0.5,
        style: settings?.style || 0,
        use_speaker_boost: settings?.speaker_boost || false,
      },
    });

    const chunks = [];
    for await (const chunk of response) {
      chunks.push(chunk);
    }

    const audio = Buffer.concat(chunks);
    await createSpeechFile(id, audio);

    return {
      blob: audio.toString('base64'),
    };
  } catch (error) {
    const err = error as ElevenLabsError;

    const decodedBody = await (err.body as any).json();

    console.error('ElevenLabs API Error:', {
      message: err.message,
      body: decodedBody,
    });

    throw new Error(decodedBody.detail.message);
  }
};

export const createSpeechFile = async (id: string, audio: Buffer) => {
  const file = new File([audio], `${id}.mp3`, { type: 'audio/mp3' });

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from('speech')
    .upload(file.name, file, { contentType: 'audio/mp3' });
  if (error) {
    throw error;
  }

  return data;
};
