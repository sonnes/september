import { ElevenLabsClient, ElevenLabs } from "elevenlabs";

const voiceId = "3vXjdKMDgxJoOLbElGxC";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export const generate = async (text: string) => {
  const response = await client.textToSpeech.convert(voiceId, {
    output_format: ElevenLabs.OutputFormat.Mp34410032,
    text: text,
    model_id: "eleven_turbo_v2",
    voice_settings: {
      stability: 0.7,
      similarity_boost: 0.5,
      style: 0,
    },
  });

  const chunks = [];
  for await (const chunk of response) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
