import { ElevenLabsClient, ElevenLabs } from "elevenlabs";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

const voiceId = "3vXjdKMDgxJoOLbElGxC";
const cacheDir = path.join(process.cwd(), "cache", "tts");

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export async function POST(req: Request) {
  const { text } = await req.json();

  // Normalize text and generate unique ID
  const normalizedText = text.trim().toLowerCase();
  const textHash = createHash("md5").update(normalizedText).digest("hex");
  const cacheFilePath = path.join(cacheDir, `${textHash}.json`);

  // Check if cached file exists
  try {
    const cachedData = await fs.readFile(cacheFilePath, "utf-8");

    const parsedData = JSON.parse(cachedData);
    return new Response(JSON.stringify(parsedData), {
      headers: {
        "Content-Type": "application/json",
        "X-Voice-ID": voiceId,
      },
    });
  } catch (error) {
    // File doesn't exist, continue with TTS conversion
  }

  const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
    output_format: ElevenLabs.OutputFormat.Mp34410032,
    text: text,
    model_id: "eleven_turbo_v2",
    voice_settings: {
      stability: 0.7,
      similarity_boost: 0.5,
      style: 0,
    },
  });

  // Save the entire response to cache
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cacheFilePath, JSON.stringify(response));

  return new Response(JSON.stringify(response), {
    headers: {
      "Content-Type": "application/json",
      "X-Voice-ID": voiceId,
    },
  });
}
