import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY as string });
const cacheDir = path.join(process.cwd(), "cache", "transcriptions");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Generate a unique hash for the audio file
    const buffer = await audioFile.arrayBuffer();
    const hash = createHash("md5").update(Buffer.from(buffer)).digest("hex");
    const cacheFilePath = path.join(cacheDir, `${hash}.json`);

    // Check if cached file exists
    try {
      const cachedData = await fs.readFile(cacheFilePath, "utf-8");
      const parsedData = JSON.parse(cachedData);
      return NextResponse.json(parsedData);
    } catch (error) {
      // File doesn't exist, continue with transcription
    }

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "distil-whisper-large-v3-en",
    });

    const response = {
      text: transcription.text,
      audio_base64: Buffer.from(buffer).toString("base64"),
    };

    // Save the response to cache
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(cacheFilePath, JSON.stringify(response));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
