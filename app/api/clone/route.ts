export async function POST(request: Request) {
  try {
    const { name, description, audioData, recordings } = await request.json();

    if (!name || (!audioData && !recordings)) {
      return NextResponse.json(
        { message: "Name and either audio file or recordings are required" },
        { status: 400 }
      );
    }

    // ... existing client setup ...

    const files: Blob[] = [];

    // Add main audio file if present
    if (audioData) {
      files.push(base64ToBlob(audioData));
    }

    // Add recordings if present
    if (recordings) {
      for (const base64Recording of Object.values(recordings)) {
        files.push(base64ToBlob(base64Recording as string));
      }
    }

    // Add voice to ElevenLabs
    const voice = await client.voices.add({
      name,
      description,
      files,
    });

    // ... rest of the handler ...
  }
} 