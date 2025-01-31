import { getSpeechFile } from "@/db/speech";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const speechFile = await getSpeechFile(id);
  if (!speechFile) {
    return NextResponse.json(
      { error: "Speech file not found" },
      { status: 404 }
    );
  }

  return new NextResponse(speechFile.audio, {
    headers: {
      "Content-Type": "audio/mp3",
      "Content-Length": speechFile.audio.length.toString(),
    },
  });
}
