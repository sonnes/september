export async function convertTextToSpeech(text: string): Promise<Blob | null> {
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      return await response.blob();
    } else {
      console.error("Failed to convert text to speech");
      return null;
    }
  } catch (error) {
    console.error("Error calling text-to-speech API:", error);
    return null;
  }
}

export async function playAudioBlob(blob: Blob) {
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  audio.play();
}
