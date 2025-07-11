import { ElevenLabs, ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

import { Audio } from '@/types/audio';

const apiKey = process.env.ELEVENLABS_API_KEY;

if (!apiKey) {
  throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
}

const elevenlabs = new ElevenLabsClient({ apiKey });

export async function generateSpeech({
  text,
  voiceId = 'JBFqnCBsd6RMkjVDRZzb', // Default voiceId, replace as needed
}: {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
}): Promise<Audio> {
  const response = await elevenlabs.textToSpeech.convertWithTimestamps(voiceId, {
    text,
    modelId: 'eleven_flash_v2_5',
    outputFormat: ElevenLabs.OutputFormat.Mp34410032,
  });

  const alignment = {
    characters: response.alignment?.characters ?? [],
    start_times: response.alignment?.characterStartTimesSeconds ?? [],
    end_times: response.alignment?.characterEndTimesSeconds ?? [],
  };

  return { blob: response.audioBase64, alignment };
}
