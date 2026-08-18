import type { AIProvider, AIServiceProvider } from '@/packages/shared';

export const BROWSER_LOCAL_AI_PROVIDERS: Partial<Record<AIProvider, AIServiceProvider>> = {
  webllm: {
    id: 'webllm',
    name: 'Browser AI (Local)',
    description: 'Open-source, browser-based AI provider. No API key required.',
    features: ['ai', 'transcription', 'speech'],
    requires_api_key: false,
    models: [
      {
        id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 1B (Fast)',
        description: 'Very fast, good for simple tasks (880MB VRAM)',
      },
      {
        id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 3B (Balanced)',
        description: 'Better reasoning, still fast (2.3GB VRAM)',
      },
      {
        id: 'SmolLM2-135M-Instruct-q0f16-MLC',
        name: 'SmolLM2 135M (Tiny)',
        description: 'Instant, extremely low resource (360MB VRAM)',
      },
      {
        id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
        name: 'SmolLM2 360M (Very Small)',
        description: 'Very fast, basic tasks (380MB VRAM)',
      },
      {
        id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
        name: 'SmolLM2 1.7B',
        description: 'Good small model (1.8GB VRAM)',
      },
      {
        id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
        name: 'Qwen 2.5 0.5B',
        description: 'High performance for size (950MB VRAM)',
      },
      {
        id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
        name: 'Qwen 2.5 1.5B',
        description: 'Strong small model (1.6GB VRAM)',
      },
      {
        id: 'gemma-2-2b-it-q4f16_1-MLC-1k',
        name: 'Gemma 2 2B',
        description: 'Google open model (1.6GB VRAM)',
      },
      {
        id: 'Phi-3.5-mini-instruct-q4f16_1-MLC-1k',
        name: 'Phi 3.5 Mini',
        description: 'Microsoft efficient model (2.5GB VRAM)',
      },
      {
        id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k',
        name: 'TinyLlama 1.1B',
        description: 'Classic small model (680MB VRAM)',
      },
    ],
  },
  kokoro: {
    id: 'kokoro',
    name: 'Kokoro TTS',
    description:
      'Natural voice that runs entirely on this device. One-time model download, no API key required.',
    features: ['speech'],
    requires_api_key: false,
    models: [
      {
        id: 'kokoro-82m-v1.0',
        name: 'Kokoro 82M v1.0',
        description: 'High-quality English TTS model (28 voices, US & UK)',
      },
    ],
  },
  whisper: {
    id: 'whisper',
    name: 'Whisper (Local)',
    description:
      'Speech-to-text that runs entirely on this device. One-time model download, no API key required.',
    features: ['transcription'],
    requires_api_key: false,
    models: [
      {
        id: 'onnx-community/whisper-base',
        name: 'Whisper Base',
        description: 'Multilingual on-device transcription (~80MB download)',
      },
    ],
  },
};
