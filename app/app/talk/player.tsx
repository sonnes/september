'use client';

import { useEffect } from 'react';

import Waveform from '@/app/app/talk/waveform';
import { Heading } from '@/components/catalyst/heading';
import { usePlayer } from '@/components/context/player';

import { useSettings } from './context';

export function Player() {
  const { playing, audio } = usePlayer();
  const { settings } = useSettings();

  useEffect(() => {
    if (!audio) return;

    async function setAudioOutputDevice() {
      if (settings.audio_output_device_id) {
        try {
          await audio?.setSinkId(settings.audio_output_device_id);
        } catch (error) {
          console.error('Failed to set audio output device:', error);
        }
      }
      audio?.play();
    }

    setAudioOutputDevice();
  }, [audio, settings.audio_output_device_id]);

  return (
    <div className="relative min-h-[3rem] w-full">
      <div className="absolute inset-0">
        <Waveform />
      </div>
      <div className="relative">
        <Heading level={2} className="text-zinc-900 mix-blend-darken">
          {playing?.text}
        </Heading>
      </div>
    </div>
  );
}
