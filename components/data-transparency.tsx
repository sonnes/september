import Link from 'next/link';

interface DataTransparencyProps {
  context: 'talk' | 'settings' | 'voices';
}

const transparencyData = {
  talk: {
    title: 'Data Usage in Talk',
    items: [
      '💬 Messages stored locally in your browser',
      '🎤 Audio recordings processed locally',
      '🤖 Text sent to AI services (Google Gemini) for suggestions',
      '🔊 Text sent to voice services (ElevenLabs) for speech synthesis'
    ]
  },
  settings: {
    title: 'Settings & Privacy',
    items: [
      '⚙️ All settings stored locally in your browser',
      '🔑 API keys stored securely on your device only',
      '👤 Profile information stays on your device',
      '🌐 No personal data sent to our servers'
    ]
  },
  voices: {
    title: 'Voice Data Usage',
    items: [
      '🎙️ Voice samples sent to ElevenLabs for synthesis',
      '📝 Text content shared with voice service',
      '🔐 Voice settings stored locally',
      '⚡ Real-time processing, not permanently stored by providers'
    ]
  }
};

export function DataTransparency({ context }: DataTransparencyProps) {
  const data = transparencyData[context];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-900">{data.title}</h3>
          <ul className="mt-2 text-sm text-blue-800 space-y-1">
            {data.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <div className="mt-3">
            <Link
              href="/privacy-policy"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Full Privacy Policy →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}