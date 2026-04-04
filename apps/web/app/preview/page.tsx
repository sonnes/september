'use client';

import { useState } from 'react';

import { ReelRenderer } from '@september/audio';

const SAMPLE_TEXTS = [
  'Hello',
  'I need water',
  'Thank you for being here with me today',
  'Can you please turn on the fan and close the window',
  'I want to tell you something important that I have been thinking about for a long time and I hope you will listen carefully',
];

export default function PreviewPage() {
  const [textIndex, setTextIndex] = useState(0);
  const [customText, setCustomText] = useState('');

  const displayText = customText || SAMPLE_TEXTS[textIndex];

  return (
    <div className="relative w-full h-screen bg-black flex flex-col">
      {/* Reel overlay area */}
      <div className="flex-1 relative">
        <ReelRenderer
          text={displayText}
          fontFamily='"Noto Sans"'
          fontWeight="700"
          className="absolute inset-0 text-white"
        />
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {SAMPLE_TEXTS.map((text, i) => (
            <button
              key={i}
              onClick={() => {
                setTextIndex(i);
                setCustomText('');
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !customText && textIndex === i
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {text.length > 30 ? text.slice(0, 30) + '...' : text}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder="Type custom text..."
          className="w-full bg-zinc-800 text-white rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20 placeholder:text-zinc-500"
        />
      </div>
    </div>
  );
}
