import { ElevenLabsClient } from 'elevenlabs';

const apiKey = process.env.ELEVENLABS_API_KEY;

if (!apiKey) {
  throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
}

const elevenlabs = new ElevenLabsClient({ apiKey });

export async function generateSpeech({
  text,
  voiceId = 'JBFqnCBsd6RMkjVDRZzb', // Default voiceId, replace as needed
  modelId = 'eleven_multilingual_v2',
  outputFormat = 'mp3_44100_128',
}: {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
}): Promise<Buffer> {
  // Call the ElevenLabs SDK to generate speech audio
  const response = await elevenlabs.textToSpeech.convert(voiceId, {
    text,
    model_id: modelId,
    output_format: outputFormat as any, // Cast to any to avoid linter error
  });

  const chunks: Buffer[] = [];
  for await (const chunk of response) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
