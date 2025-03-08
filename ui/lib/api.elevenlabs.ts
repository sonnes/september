import { ElevenLabsClient } from 'elevenlabs';

export const ElevenAPI = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
