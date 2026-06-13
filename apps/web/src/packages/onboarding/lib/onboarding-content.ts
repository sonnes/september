export const ONBOARDING_STEPS = [
  {
    label: 'Welcome',
    description: 'What September does',
  },
  {
    label: 'You',
    description: 'Name and speaking style',
  },
  {
    label: 'Voice',
    description: 'Speech and voice choice',
  },
  {
    label: 'Suggestions',
    description: 'Extra services and words',
  },
] as const;

export const DEFAULT_SPEAKING_STYLE = 'Plain, warm, and direct. Use everyday language.';

export const ONBOARDING_PRIMARY_COPY = {
  sidebar: {
    title: 'Set up without the hard parts.',
    description:
      'Recommended choices are ready. People who already use extra services can connect them, but nobody has to start there.',
  },
  welcome: {
    eyebrow: 'Step 1 of 4',
    title: 'Faster communication, fewer keystrokes.',
    subtitle:
      'September helps you type, speak, and connect naturally. Start with simple defaults, then add more when you are ready.',
    helper: 'Get started in minutes.',
    primaryAction: 'Start',
    path: [
      {
        title: 'Open in any browser',
        description: 'No downloads or complex setup.',
      },
      {
        title: 'Start with simple defaults',
        description: 'Use the built-in voice and built-in suggestions first.',
      },
      {
        title: 'Short taps',
        description: 'Suggestion buttons help reduce typing.',
      },
      {
        title: 'Full expression',
        description: 'Common needs, feelings, and social phrases stay easy to reach.',
      },
    ],
    examples: [
      'I need a little more time to answer.',
      'Could you move my chair closer to the window?',
      'Thank you. That really helps.',
    ],
  },
  profile: {
    eyebrow: 'Step 2 of 4',
    title: 'Tell us about yourself.',
    subtitle: 'Keep this short. A caregiver can fill it in now and improve it later.',
    helper: 'Only the name is required.',
    primaryAction: 'Save and continue',
    personas: [
      {
        label: 'Plain',
        description: 'Clear and short',
        value: 'Plain, warm, and direct. Use everyday language.',
      },
      {
        label: 'Warm',
        description: 'Friendly and gentle',
        value: 'Warm, friendly, and reassuring. Keep messages clear and kind.',
      },
      {
        label: 'Detailed',
        description: 'A little more context',
        value: 'Clear and thoughtful. Add a little context when it helps people understand.',
      },
    ],
  },
  voice: {
    eyebrow: 'Step 3 of 4',
    title: 'Set up your voice.',
    subtitle: 'The built-in voice works right away. Connected voice services are optional.',
    helper: 'Voice can be changed any time.',
    primaryAction: 'Use selected voice',
    options: [
      {
        id: 'browser',
        title: 'Built-in voice',
        description: 'Fastest start. No login and no extra setup.',
      },
      {
        id: 'elevenlabs',
        title: 'ElevenLabs',
        description: 'Speak in your own voice if ElevenLabs is already set up.',
      },
      {
        id: 'gemini',
        title: 'Gemini speech',
        description: 'Google voice options if you already use Gemini.',
      },
    ],
  },
  suggestions: {
    eyebrow: 'Step 4 of 4',
    title: 'AI that learns how you talk.',
    subtitle:
      'Start with built-in suggestions. Add notes, documents, and memories when you want richer conversations.',
    helper: 'Extra services and personal words are optional.',
    primaryAction: 'Start communicating',
    options: [
      {
        id: 'built-in',
        title: 'Use built-in suggestions',
        description: 'Recommended. Works without extra setup.',
      },
      {
        id: 'openrouter',
        title: 'Connect OpenRouter',
        description: 'Optional extra service for richer suggestions.',
      },
      {
        id: 'personal-words',
        title: 'Add personal words',
        description: 'Paste names, care phrases, routines, or topics September should know.',
      },
    ],
  },
} as const;
