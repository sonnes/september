import { ElevenLabsClient, ElevenLabs } from "elevenlabs";

const voiceId = "zeTFANH8Ybln8sjiUtmJ";

export async function POST(req: Request) {
  const { text } = await req.json();

  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVEN_LABS_API_KEY,
  });

  const audioBuffer = await client.textToSpeech.convert(voiceId, {
    optimize_streaming_latency: ElevenLabs.OptimizeStreamingLatency.Zero,
    output_format: ElevenLabs.OutputFormat.Mp32205032,
    text: text,
    voice_settings: {
      stability: 0.1,
      similarity_boost: 0.3,
      style: 0.2,
    },
  });

  const chunks: Uint8Array[] = [];
  for await (const chunk of audioBuffer) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
    },
  });
}
