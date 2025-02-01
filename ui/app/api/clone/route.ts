import { NextResponse } from "next/server";
import { ElevenLabsClient } from "elevenlabs";

// Helper function to convert base64 to blob
function base64ToBlob(base64: string): Blob {
  const buffer = Buffer.from(base64, "base64");
  return new Blob([buffer]);
}

export async function POST(request: Request) {
  try {
    const { name, description, audioData } = await request.json();

    if (!name || !audioData) {
      return NextResponse.json(
        { message: "Name and audio data are required" },
        { status: 400 }
      );
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { message: "ElevenLabs API key is not configured" },
        { status: 500 }
      );
    }

    const client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    // Convert base64 to blob instead of stream
    const audioBlob = base64ToBlob(audioData);

    // Add voice to ElevenLabs
    const voice = await client.voices.add({
      name,
      description,
      files: [audioBlob],
    });

    return NextResponse.json({
      message: "Voice clone created successfully",
      voiceId: voice.voice_id,
    });
  } catch (error) {
    console.error("Voice cloning error:", error);

    // Handle specific API errors
    if (error instanceof Error) {
      const message = error.message || "Failed to clone voice";
      // Check if it's a rate limit or quota error
      if (message.includes("quota") || message.includes("rate limit")) {
        return NextResponse.json(
          { message: "Voice cloning quota exceeded. Please try again later." },
          { status: 429 }
        );
      }
      // Check if it's an authentication error
      if (
        message.includes("authentication") ||
        message.includes("unauthorized")
      ) {
        return NextResponse.json(
          { message: "Authentication failed. Please check your API key." },
          { status: 401 }
        );
      }
      return NextResponse.json({ message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
