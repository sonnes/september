import { GoogleGenAI } from '@google/genai';
import { GeminiSpeechSettings } from '@/types/ai-config';
import { Voice } from '@/types/voice';
import { ListVoicesRequest, SpeechEngine, SpeechRequest, SpeechResponse } from '@/packages/speech/types';

/**
 * Convert L16 PCM audio data to WAV format
 * @param base64Data - Base64 encoded L16 PCM data
 * @param sampleRate - Sample rate (24000 Hz for Gemini)
 * @param numChannels - Number of channels (1 for mono)
 * @returns Data URL with WAV audio
 */
function convertL16ToWav(base64Data: string, sampleRate: number, numChannels: number): string {
  // Decode base64 to binary
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // L16 is 16-bit PCM, so we need to interpret the bytes as Int16
  const pcmData = new Int16Array(bytes.buffer);

  // Create WAV header
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length * 2; // 2 bytes per sample for 16-bit

  // WAV file structure
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Combine header and PCM data
  const wavData = new Uint8Array(44 + dataSize);
  wavData.set(new Uint8Array(wavHeader), 0);
  wavData.set(new Uint8Array(pcmData.buffer), 44);

  // Convert to base64
  let binary = '';
  const len2 = wavData.byteLength;
  for (let i = 0; i < len2; i++) {
    binary += String.fromCharCode(wavData[i]);
  }
  const base64 = btoa(binary);

  return `data:audio/wav;base64,${base64}`;
}

/**
 * Helper function to write string to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Gemini voice options with their characteristics
const GEMINI_VOICES: Array<{ id: string; name: string; characteristic: string; language: string }> =
  [
    { id: 'Aoede', name: 'Aoede', characteristic: 'Breezy', language: 'en-US' },
    { id: 'Achernar', name: 'Achernar', characteristic: 'Soft', language: 'en-US' },
    { id: 'Achird', name: 'Achird', characteristic: 'Friendly', language: 'en-US' },
    { id: 'Algenib', name: 'Algenib', characteristic: 'Gravelly', language: 'en-US' },
    { id: 'Algieba', name: 'Algieba', characteristic: 'Smooth', language: 'en-US' },
    { id: 'Alnilam', name: 'Alnilam', characteristic: 'Firm', language: 'en-US' },
    { id: 'Autonoe', name: 'Autonoe', characteristic: 'Bright', language: 'en-US' },
    { id: 'Callirrhoe', name: 'Callirrhoe', characteristic: 'Easy-going', language: 'en-US' },
    { id: 'Charon', name: 'Charon', characteristic: 'Informative', language: 'en-US' },
    { id: 'Despina', name: 'Despina', characteristic: 'Smooth', language: 'en-US' },
    { id: 'Enceladus', name: 'Enceladus', characteristic: 'Breathy', language: 'en-US' },
    { id: 'Erinome', name: 'Erinome', characteristic: 'Clear', language: 'en-US' },
    { id: 'Fenrir', name: 'Fenrir', characteristic: 'Excitable', language: 'en-US' },
    { id: 'Gacrux', name: 'Gacrux', characteristic: 'Mature', language: 'en-US' },
    { id: 'Iapetus', name: 'Iapetus', characteristic: 'Clear', language: 'en-US' },
    { id: 'Kore', name: 'Kore', characteristic: 'Firm', language: 'en-US' },
    { id: 'Laomedeia', name: 'Laomedeia', characteristic: 'Upbeat', language: 'en-US' },
    { id: 'Leda', name: 'Leda', characteristic: 'Youthful', language: 'en-US' },
    { id: 'Orus', name: 'Orus', characteristic: 'Firm', language: 'en-US' },
    { id: 'Puck', name: 'Puck', characteristic: 'Upbeat', language: 'en-US' },
    { id: 'Pulcherrima', name: 'Pulcherrima', characteristic: 'Forward', language: 'en-US' },
    { id: 'Rasalgethi', name: 'Rasalgethi', characteristic: 'Informative', language: 'en-US' },
    { id: 'Sadachbia', name: 'Sadachbia', characteristic: 'Lively', language: 'en-US' },
    { id: 'Sadaltager', name: 'Sadaltager', characteristic: 'Knowledgeable', language: 'en-US' },
    { id: 'Schedar', name: 'Schedar', characteristic: 'Even', language: 'en-US' },
    { id: 'Sulafat', name: 'Sulafat', characteristic: 'Warm', language: 'en-US' },
    { id: 'Umbriel', name: 'Umbriel', characteristic: 'Easy-going', language: 'en-US' },
    { id: 'Vindemiatrix', name: 'Vindemiatrix', characteristic: 'Gentle', language: 'en-US' },
    { id: 'Zephyr', name: 'Zephyr', characteristic: 'Bright', language: 'en-US' },
    { id: 'Zubenelgenubi', name: 'Zubenelgenubi', characteristic: 'Casual', language: 'en-US' },
  ];

export class GeminiSpeechProvider implements SpeechEngine {
  id = 'gemini';
  name = 'Gemini Speech';
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async generateSpeech(request: SpeechRequest): Promise<SpeechResponse> {
    const settings = request.options as GeminiSpeechSettings;
    const voiceName = request.voice?.id || settings.voice_name || 'Aoede';
    const modelId = 'gemini-2.5-flash-preview-tts';

    try {
      const response = await this.ai.models.generateContent({
        model: modelId,
        contents: [
          {
            parts: [{ text: request.text }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      });

      // Extract audio data from the response
      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.find(p =>
        p.inlineData?.mimeType?.startsWith('audio/')
      );

      if (!part?.inlineData?.data) {
        throw new Error('No audio data received from Gemini Speech API');
      }

      // Convert L16 PCM to WAV format
      const wavBlob = convertL16ToWav(part.inlineData.data, 24000, 1);

      return {
        blob: wavBlob,
      };
    } catch (err) {
      console.error('Gemini speech generation error:', err);
      throw new Error(
        `Gemini Speech API error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  async listVoices(request: ListVoicesRequest): Promise<Voice[]> {
    const page = request.page || 1;
    const limit = request.limit || 100;

    let filteredVoices = GEMINI_VOICES;

    // Filter by search term
    if (request.search) {
      const searchLower = request.search.toLowerCase();
      filteredVoices = filteredVoices.filter(
        voice =>
          voice.name.toLowerCase().includes(searchLower) ||
          voice.characteristic.toLowerCase().includes(searchLower)
      );
    }

    // Filter by language
    if (request.language) {
      filteredVoices = filteredVoices.filter(voice => voice.language === request.language);
    }

    // Sort alphabetically by name
    filteredVoices.sort((a, b) => a.name.localeCompare(b.name));

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedVoices = filteredVoices.slice(startIndex, startIndex + limit);

    return paginatedVoices.map(voice => ({
      id: voice.id,
      name: `${voice.name} (${voice.characteristic})`,
      language: voice.language,
      // Include additional properties for the UI
      characteristic: voice.characteristic,
    }));
  }

  setApiKey(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }
}

