import { ElevenLabsClient, ElevenLabs } from "elevenlabs";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

const voiceId = "3vXjdKMDgxJoOLbElGxC";
const cacheDir = path.join(process.cwd(), "cache", "tts");

export async function POST(req: Request) {
  const { text } = await req.json();

  // Normalize text and generate unique ID
  const normalizedText = text.trim().toLowerCase();
  const textHash = createHash("md5").update(normalizedText).digest("hex");
  const cacheFilePath = path.join(cacheDir, `${textHash}.mp3`);

  // Check if cached file exists
  try {
    const cachedAudio = await fs.readFile(cacheFilePath);
    return new Response(cachedAudio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "X-Voice-ID": voiceId,
      },
    });
  } catch (error) {
    // File doesn't exist, continue with TTS conversion
  }

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

  // Save audio to cache
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cacheFilePath, buffer);

  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "X-Voice-ID": voiceId,
    },
  });
}
