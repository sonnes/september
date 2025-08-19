'use client';

import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';

import { useAudioPlayer } from '@/hooks/use-audio-player';

export default function MuteButton() {
  const { isMuted, toggleMute } = useAudioPlayer();

  return (
    <button
      onClick={toggleMute}
      className="p-2 text-white rounded-full transition-colors cursor-pointer"
    >
      {isMuted ? <SpeakerXMarkIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
    </button>
  );
}
