interface CloneVoiceOptions {
  files: File[];
  name: string;
  description?: string;
}

interface CloneVoiceResponse {
  voice_id: string;
  name: string;
}

export interface SimilarVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  similarity_score?: number;
}

interface SimilarVoicesResponse {
  voices: SimilarVoice[];
}

export class ElevenLabsVoiceClone {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async cloneVoice({ files, name, description }: CloneVoiceOptions): Promise<CloneVoiceResponse> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    if (files.length === 0) {
      throw new Error('At least one audio file is required');
    }

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('name', name);
    if (description) formData.append('description', description);
    formData.append('labels', JSON.stringify({ app: 'september' }));

    const response = await fetch(`${this.baseUrl}/v1/voices/add`, {
      method: 'POST',
      headers: { 'xi-api-key': this.apiKey },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `ElevenLabs API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return { voice_id: data.voice_id, name: data.name || name };
  }

  /**
   * Find voices in the ElevenLabs library that sound similar to the provided audio samples.
   * Uses the voice similarity search endpoint.
   */
  async findSimilarVoices(files: File[]): Promise<SimilarVoice[]> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    if (files.length === 0) {
      throw new Error('At least one audio file is required');
    }

    const formData = new FormData();
    files.forEach(file => formData.append('audio_samples', file));

    const response = await fetch(`${this.baseUrl}/v1/voices/similar`, {
      method: 'POST',
      headers: { 'xi-api-key': this.apiKey },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `ElevenLabs API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data: SimilarVoicesResponse = await response.json();
    return data.voices ?? [];
  }
}
