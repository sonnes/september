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

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "distil-whisper-large-v3-en",
    });

    const response = {
      text: transcription.text,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
