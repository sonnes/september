interface CloneVoiceOptions {
  files: File[];
  name: string;
  description?: string;
}

interface CloneVoiceResponse {
  voice_id: string;
  name: string;
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
    
    // Add files to FormData
    files.forEach(file => {
      formData.append('files', file);
    });

    // Add name and description
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }

    // Add labels
    formData.append('labels', JSON.stringify({ app: 'september' }));

    const url = `${this.baseUrl}/v1/voices/add`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
      },
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

    return {
      voice_id: data.voice_id,
      name: data.name || name,
    };
  }
}

