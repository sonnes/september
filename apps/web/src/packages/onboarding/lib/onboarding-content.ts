export const ONBOARDING_STEPS = [
  {
    label: 'Welcome',
    description: 'What September does',
  },
  {
    label: 'About you',
    description: 'Name and speaking style',
  },
  {
    label: 'Choose setup',
    description: 'Pick how September runs',
  },
  {
    label: 'Finish',
    description: 'Apply and start',
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
    primaryAction: 'Get started',
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
    personalWords: {
      label: 'Add personal words',
      description: 'Paste names, care phrases, routines, or topics September should know.',
      placeholder: 'Amma. Dr. Shah. I need a short rest. Please give me a moment.',
    },
  },
  mode: {
    eyebrow: 'Step 3 of 4',
    title: 'How should September run?',
    subtitle: 'Pick what fits. You can change any of this later in Settings.',
    helper: 'You can switch modes anytime in Settings.',
    primaryAction: 'Continue',
  },
  // Voice option labels reused by the Advanced finish step's voice picker.
  voice: {
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
  finish: {
    privacy: {
      eyebrow: 'Step 4 of 4',
      title: "You're all set.",
      subtitle: 'Everything stays on this device. You can connect a service later in Settings.',
      helper: 'You can change this anytime in Settings.',
      primaryAction: 'Start communicating',
      summary: [
        'Browser speech — no setup, works offline.',
        'Saved phrases ready on every space.',
        'Nothing is sent out for suggestions.',
      ],
    },
    free: {
      eyebrow: 'Step 4 of 4',
      title: 'Connect free AI.',
      subtitle: 'One click opens OpenRouter and returns you here. Nothing else in setup changes.',
      helper: 'Connect OpenRouter or choose built-in.',
      primaryAction: 'Start communicating',
      connectTitle: 'Connect OpenRouter',
      connectBody:
        'A free option for richer writing help. September only sends the current message when you ask for suggestions.',
      connectAction: 'Connect OpenRouter',
      connectingAction: 'Connecting…',
      connectedNote: 'Connected — ready to finish.',
      pendingNote: 'Not connected yet.',
      fallbackTitle: 'Prefer none? Use built-in instead',
      fallbackBody: 'Switch to Privacy mode — no AI service.',
    },
    advanced: {
      eyebrow: 'Step 4 of 4',
      title: 'Connect your services.',
      subtitle: 'Add your own keys and pick the voice and writing helper you prefer.',
      helper: 'September contacts only the services you choose.',
      primaryAction: 'Start communicating',
      voiceLabel: 'Voice',
      writingLabel: 'Writing help',
      searchPlaceholder: 'Search voices...',
    },
  },
} as const;
